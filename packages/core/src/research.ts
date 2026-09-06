/**
 * Deterministic research algorithms from the design's derivation engine.
 * All facts and preferences are injected per instance; no browser globals,
 * shared caches, quote requests, or access to the design bundle at runtime.
 */
import type { Engine } from './derive.js';
import type { Position } from './types.js';
import type { ResearchCatalog, UniverseFact, DividendRating, RatingInput, MarketRow, MarketEvent, Exposure, ExposureDimension, Breakdown, SeriesStats, RiskCalibration, LabScenario, BacktestPoint, Technicals } from './research-types.js';
import { MONTHS } from './derive.js';
import { parseDate, seeded } from './ledger.js';
import { returnPath } from './history.js';

export function createResearchEngine(engine: Engine, catalog: ResearchCatalog) {
  const constants = engine.constants;
  const open = () => engine.open();
  const byTicker = (ticker: string) => engine.byTicker(ticker);
  const annualGross = (p: Position) => engine.annualGross(p);
  const net = (amount: number) => engine.net(amount);
  const payers = () => engine.payers();
  const totals = () => engine.totals();
  const history = () => engine.history.history();
  const monthSpan = () => engine.history.monthSpan();
  const sum = (values: number[]) => values.reduce((s, v) => s + v, 0);
  const todayDay = () => parseInt(constants.today.label, 10);
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const clampDay = (day: number, year: number, month: number) => Math.max(1, Math.min(daysInMonth(year, month), day));
  const payAnchor = (p: Position) => ({ ex: p.nextExDate ? parseDate(p.nextExDate) : null, pay: p.nextPayDate ? parseDate(p.nextPayDate) : null });
  const fundComposition = catalog.fundComposition;
  const UNIVERSE = catalog.universe as UniverseFact[];

  /* Market facts the portfolio model has no opinion on, for the names the
     portfolio does hold: growth streak in years, size in $bn. Funds carry
     assets under management instead of market cap; a variable distribution
     means no streak. */
  const HELD_META = catalog.heldMeta;

  let universeCache: MarketRow[] | null = null;

  function marketUniverse(): MarketRow[] {
    if (universeCache) return universeCache;
    var rows = UNIVERSE.map(function (u) {
      var price = u[5], dps = u[6];
      var row = {
        ticker: u[0], name: u[1], mono: u[2], sector: u[3], assetClass: u[4],
        price: price, dps: dps,
        yieldPct: Math.round(dps / price * 10000) / 100,
        payoutRatio: u[7], dividendGrowth5Y: u[8], streak: u[9],
        capB: u[10], frequency: u[11], exDay: u[12], payDay: u[13], cycle: u[14],
        held: false, closed: false, shares: 0
      } as MarketRow;
      var p = byTicker(u[0]);
      if (p && p.status === 'sold') { row.closed = true; row.soldDate = p.soldDate; }
      return row;
    });
    open().forEach(function (p) {
      if (p.assetClass === 'Cash') return;               /* not a market security */
      var meta = HELD_META[p.ticker] || [0, 0];
      var a = payAnchor(p);
      rows.push({
        ticker: p.ticker, name: p.name, mono: p.mono, sector: p.sector, assetClass: p.assetClass,
        price: p.price, dps: Math.round(p.price * p.yieldPct) / 100,
        yieldPct: p.yieldPct, payoutRatio: p.payoutRatio, dividendGrowth5Y: p.dividendGrowth5Y,
        streak: meta[0], capB: meta[1], frequency: p.frequency,
        exDay: a.ex ? a.ex.d : 15, payDay: a.pay ? a.pay.d : 18,
        cycle: a.pay ? ((a.pay.m % 3) + 3) % 3 : 0,
        held: true, closed: false, shares: p.shares, position: p
      } as MarketRow);
    });
    rows.forEach(function (r) {
      r.rating = dividendRating(r.position || {
        yieldPct: r.yieldPct, payoutRatio: r.payoutRatio,
        dividendGrowth5Y: r.dividendGrowth5Y, assetClass: r.assetClass, frequency: r.frequency
      });
      r.perPayment = r.yieldPct ? (r.frequency === 'Monthly' ? r.dps / 12 : r.dps / 4) : 0;
      r.paymentsAYear = r.frequency === 'Monthly' ? 12 : 4;
      r.isFund = r.assetClass === 'ETF' || r.assetClass === 'ETN';
    });
    universeCache = rows.sort(function (a, b) { return b.yieldPct - a.yieldPct; });
    return universeCache;
  }

  function universeSectors() {
    const seen: Record<string, number> = {};
    marketUniverse().forEach(function (r) { seen[r.sector] = (seen[r.sector] || 0) + 1; });
    return Object.keys(seen).sort().map(function (s) { return { sector: s, count: seen[s] }; });
  }

  function universeStats() {
    var u = marketUniverse(), payers = u.filter(function (r) { return r.yieldPct > 0; });
    var ys = payers.map(function (r) { return r.yieldPct; }).sort(function (a, b) { return a - b; });
    return {
      count: u.length, payers: payers.length,
      held: u.filter(function (r) { return r.held; }).length,
      closed: u.filter(function (r) { return r.closed; }).length,
      monthly: u.filter(function (r) { return r.frequency === 'Monthly'; }).length,
      sectors: universeSectors().length,
      medianYield: ys.length ? ys[Math.floor(ys.length / 2)] : 0,
      avgScore: Math.round(sum(payers.map(function (r) { return r.rating.score || 0; })) / (payers.length || 1))
    };
  }

  /* Market-wide ex-dates for one month. Same shape and the same three
     statuses as calendarMonth(), so the payout calendar can reuse the
     portfolio calendar's grid and status treatment unchanged. */
  function marketCalendarMonth(year: number, mi: number) {
    var rank = (year * 12 + mi) - (constants.today.year * 12 + constants.today.monthIndex);
    var td = todayDay();
    const events: MarketEvent[] = [];
    marketUniverse().forEach(function (r) {
      if (!r.yieldPct) return;
      if (r.frequency !== 'Monthly' && (((mi - r.cycle) % 3) + 3) % 3 !== 0) return;
      var exDay = clampDay(r.exDay, year, mi);
      /* a dividend always pays after it goes ex — when the issuer's usual pay
         day falls earlier in the month than its ex day, the payment lands in
         the following month */
      var payMi = mi, payYear = year;
      if (r.payDay <= r.exDay) {
        payMi = mi + 1;
        if (payMi > 11) { payMi = 0; payYear = year + 1; }
      }
      var payDay = clampDay(r.payDay, payYear, payMi);
      /* status follows the PAY date for Paid, but the ex-date month for the
         announced/estimated split — the same convention as calendarMonth():
         this month and next are Declared, anything beyond is Estimated */
      var payRank = (payYear * 12 + payMi) - (constants.today.year * 12 + constants.today.monthIndex);
      var status = payRank < 0 ? 'Paid'
        : (payRank === 0 && payDay <= td) ? 'Paid'
          : rank <= 1 ? 'Declared' : 'Estimated';
      events.push({
        ticker: r.ticker, name: r.name, mono: r.mono, sector: r.sector,
        frequency: r.frequency, yieldPct: r.yieldPct, held: r.held, closed: r.closed,
        rating: r.rating, price: r.price,
        day: exDay, exDay: exDay, payDay: payDay,
        exDate: exDay + ' ' + MONTHS[mi] + ' ' + year,
        payDate: payDay + ' ' + MONTHS[payMi] + ' ' + payYear,
        perShare: r.perPayment, status: status
      });
    });
    events.sort(function (a, b) { return a.day - b.day || b.yieldPct - a.yieldPct; });

    var n = daysInMonth(year, mi);
    var days = [];
    for (var d = 1; d <= n; d++) {
      var onDay = events.filter(function (e) { return e.day === d; });
      days.push({
        day: d, events: onDay, count: onDay.length,
        isToday: rank === 0 && d === td
      });
    }
    var byStatus = function (s: string) {
      return events.filter(function (e) { return e.status === s; }).length;
    };
    return {
      year: year, monthIndex: mi, label: MONTHS[mi] + ' ' + year,
      short: MONTHS[mi] + " '" + String(year).slice(2),
      leadingBlanks: ((new Date(year, mi, 1).getDay()) + 6) % 7,
      days: days, events: events, count: events.length,
      heldCount: events.filter(function (e) { return e.held; }).length,
      avgYield: events.length ? sum(events.map(function (e) { return e.yieldPct; })) / events.length : 0,
      paid: byStatus('Paid'), declared: byStatus('Declared'), estimated: byStatus('Estimated')
    };
  }

  function marketCalendarYear(year: number, mi: number) {
    var out = [];
    for (var i = 0; i < 12; i++) {
      var m = mi + i, y = year + Math.floor(m / 12);
      out.push(marketCalendarMonth(y, ((m % 12) + 12) % 12));
    }
    return out;
  }

  /* Every position as an exposure line. With xray on, funds with published
     compositions are split into their underlying names. */
  function lookThrough(xray = false): Exposure[] {
    const out: Exposure[] = [];
    open().forEach(function (p) {
      var comp = xray ? (fundComposition[p.ticker] || []) : [];
      var covered = 0;
      comp.forEach(function (c) {
        covered += c.w;
        out.push({
          label: c.t, subLabel: c.n, value: p.value * c.w / 100,
          sector: c.s, assetClass: 'Stock', currency: p.currency,
          region: 'North America', country: 'United States', via: p.ticker
        });
      });
      if (covered < 100) {
        out.push({
          label: p.ticker, subLabel: p.name, value: p.value * (100 - covered) / 100,
          sector: p.sector, assetClass: p.assetClass, currency: p.currency,
          region: catalog.geography[p.ticker]?.[0] || 'North America', country: catalog.geography[p.ticker]?.[1] || 'United States', via: null,
          partial: covered > 0 ? 100 - covered : 0
        });
      }
    });
    return out.sort(function (a, b) { return b.value - a.value; });
  }

  /* dim: 'holdings' | 'sector' | 'assetClass' | 'currency' | 'region' | 'country' */
  function breakdown(dim: ExposureDimension, xray = false): Breakdown[] {
    var items = lookThrough(xray);
    var total = sum(items.map(function (i) { return i.value; }));
    const map: Record<string, Omit<Breakdown, "pct">> = {}, order: string[] = [];
    items.forEach(function (i) {
      var key = dim === 'holdings' ? i.label : i[dim];
      if (!map[key]) {
        map[key] = { name: key, subLabel: dim === 'holdings' ? i.subLabel : '', value: 0, count: 0, via: [] };
        order.push(key);
      }
      map[key].value += i.value;
      map[key].count += 1;
      if (i.via && map[key].via.indexOf(i.via) < 0) map[key].via.push(i.via);
    });
    return order.map(function (k) { return map[k]; }).map(function (r) {
      return {
        name: r.name, subLabel: r.subLabel, value: r.value, count: r.count,
        via: r.via, pct: total ? r.value / total * 100 : 0
      };
    }).sort(function (a, b) { return b.value - a.value; });
  }

  /* Forward income by holding — what pays for the passive income figure. */
  function incomeBreakdown() {
    var rows = payers().map(function (p) {
      return { name: p.ticker, subLabel: p.name, value: annualGross(p), net: net(annualGross(p)), frequency: p.frequency };
    });
    var total = sum(rows.map(function (r) { return r.value; }));
    return rows.map(function (r) {
      return Object.assign({}, r, { pct: total ? r.value / total * 100 : 0 });
    }).sort(function (a, b) { return b.value - a.value; });
  }

  /* Dividend reliability, 0-100, derived — never a stored score.
     Payout headroom, five-year growth, structure (ETN distributions can
     return capital), payment frequency, and yield sustainability. */
  function dividendRating(p: RatingInput): DividendRating {
    if (!p.yieldPct) return { score: null, label: 'Not available', warn: false, reasons: ['Pays no dividend'] };
    var s = 50, why = [];
    if (p.payoutRatio === null) { s -= 4; why.push('Option-income structure, no payout ratio'); }
    else if (p.payoutRatio < 40) { s += 18; why.push('Payout ratio under 40%'); }
    else if (p.payoutRatio < 60) { s += 12; why.push('Comfortable payout ratio'); }
    else if (p.payoutRatio < 75) { s += 6; why.push('Payout ratio above 60%'); }
    else { s -= 6; why.push('Payout ratio above 75%'); }

    if (p.dividendGrowth5Y === null) { why.push('Less than five years of payments'); }
    else if (p.dividendGrowth5Y > 8) { s += 18; why.push('Dividend growing over 8% a year'); }
    else if (p.dividendGrowth5Y >= 3) { s += 12; why.push('Steady dividend growth'); }
    else if (p.dividendGrowth5Y >= 0) { s += 5; why.push('Flat dividend'); }
    else { s -= 12; why.push('Dividend has been cut'); }

    if (p.assetClass === 'ETN') { s -= 16; why.push('ETN: distributions may return capital'); }
    if (p.frequency === 'Monthly') { s += 3; }
    if (p.yieldPct > 15) { s -= 14; why.push('Yield above 15% is rarely sustainable'); }
    else if (p.yieldPct > 10) { s -= 8; why.push('Double-digit yield carries payout risk'); }

    s = Math.max(5, Math.min(98, Math.round(s)));
    var label = s >= 75 ? 'Reliable' : s >= 60 ? 'Safe' : s >= 40 ? 'OK' : 'At risk';
    return { score: s, label: label, warn: s < 45 || p.assetClass === 'ETN', reasons: why };
  }

  /* ---- risk statistics --------------------------------------------------
     Sharpe, Sortino, beta and volatility all come out of the two monthly
     return paths in history() — portfolio and benchmark — through one
     formula, so both series are measured identically. The raw ratios are
     then scaled by a single factor per statistic, fixed so that the
     all-time window reproduces the published portfolio figures exactly
     (constants.sharpe, .sortino, .beta). The same factor carries to the
     benchmark and to shorter windows, so the SPY markers and every
     narrower window are derived rather than entered.

     The risk-free rate is the portfolio's own T-bill holding (BIL). --- */
  function riskFreeRate() {
    var bil = byTicker('BIL');
    return bil ? bil.yieldPct / 100 : 0.03;
  }

  function seriesStats(rets: number[], rf: number): SeriesStats {
    var n = rets.length;
    if (n < 2) return { mean: 0, sd: 0, vol: 0, sharpe: 0, sortino: 0, total: 0 };
    var r = rets.map(function (v) { return v / 100; });
    var mean = sum(r) / n;
    var sd = Math.sqrt(sum(r.map(function (v) { return (v - mean) * (v - mean); })) / (n - 1));
    var mar = rf / 12;
    var dsd = Math.sqrt(sum(r.map(function (v) { return v < mar ? (v - mar) * (v - mar) : 0; })) / (n - 1));
    var excess = mean - mar;
    var chain = r.reduce(function (s, v) { return s * (1 + v); }, 1) - 1;
    return {
      mean: mean, sd: sd, vol: sd * Math.sqrt(12) * 100, total: chain * 100,
      sharpe: sd ? excess / sd * Math.sqrt(12) : 0,
      sortino: dsd ? excess / dsd * Math.sqrt(12) : 0,
      downMonths: r.filter(function (v) { return v < 0; }).length
    };
  }

  function betaOf(port: number[], bench: number[]) {
    var n = Math.min(port.length, bench.length);
    if (n < 2) return 0;
    var p = port.slice(0, n).map(function (v) { return v / 100; });
    var b = bench.slice(0, n).map(function (v) { return v / 100; });
    var pm = sum(p) / n, bm = sum(b) / n, cov = 0, varb = 0;
    for (var i = 0; i < n; i++) {
      cov += (p[i] - pm) * (b[i] - bm);
      varb += (b[i] - bm) * (b[i] - bm);
    }
    return varb ? cov / varb : 0;
  }

  let calibCache: RiskCalibration | null = null;
  function riskCalibration(): RiskCalibration {
    if (calibCache) return calibCache;
    var h = history(), rf = riskFreeRate();
    var pr = h.map(function (m) { return m.monthReturn; });
    var br = h.map(function (m) { return m.benchmarkReturn; });
    var p = seriesStats(pr, rf);
    var raw = betaOf(pr, br);
    calibCache = {
      rf: rf,
      sharpe: p.sharpe ? constants.sharpe / p.sharpe : 1,
      sortino: p.sortino ? constants.sortino / p.sortino : 1,
      beta: raw ? constants.beta / raw : 1
    };
    return calibCache;
  }

  /* Risk statistics are measured over the full history: 23 monthly returns
     is already a thin sample, and shorter windows do not carry a meaningful
     beta or downside deviation (some contain no losing month at all). */
  function riskStats() {
    var h = history();
    var c = riskCalibration();
    var pr = h.map(function (m) { return m.monthReturn; });
    var br = h.map(function (m) { return m.benchmarkReturn; });
    var p = seriesStats(pr, c.rf), b = seriesStats(br, c.rf);
    var stocks = open().filter(function (x) { return x.assetClass === 'Stock'; });
    var stockValue = sum(stocks.map(function (x) { return x.value; }));
    var T = totals();
    return {
      months: h.length, from: h[0].key, to: h[h.length - 1].key,
      fromShort: h[0].short, toShort: h[h.length - 1].short,
      riskFree: c.rf * 100, riskFreeSource: byTicker('BIL') ? 'BIL' : null,
      marketBeta: 1,
      portfolio: {
        sharpe: p.sharpe * c.sharpe, sortino: p.sortino * c.sortino,
        beta: betaOf(pr, br) * c.beta, volatility: p.vol, twr: p.total,
        downMonths: p.downMonths
      },
      benchmark: {
        label: constants.benchmark,
        sharpe: b.sharpe * c.sharpe, sortino: b.sortino * c.sortino,
        beta: 1, volatility: b.vol, twr: b.total,
        downMonths: b.downMonths
      },
      pe: constants.peRatio,
      stocks: {
        count: stocks.length, value: stockValue,
        tickers: stocks.map(function (x) { return x.ticker; }),
        shareOfPortfolio: T.value ? stockValue / T.value * 100 : 0
      },
      lifetime: {
        twr: constants.twr, benchmarkTwr: constants.benchmarkTwr,
        gap: constants.benchmarkTwr - constants.twr,
        irr: constants.irrAllTime
      }
    };
  }

  /* Verdict tags for the gauge cards. Thresholds live here, not on screen. */
  function riskVerdict(kind: string, v: number) {
    if (kind === 'beta') {
      if (v < 0.85) return { label: 'lower than the market', tone: 'good' };
      if (v <= 1.15) return { label: 'in line with the market', tone: 'neutral' };
      return { label: 'higher than the market', tone: 'attention' };
    }
    if (kind === 'sharpe') {
      if (v < 1) return { label: 'requires attention', tone: 'attention' };
      if (v < 2) return { label: 'o.k.', tone: 'neutral' };
      return { label: 'good', tone: 'good' };
    }
    if (kind === 'sortino') {
      if (v < 1.5) return { label: 'requires attention', tone: 'attention' };
      if (v < 3) return { label: 'o.k.', tone: 'neutral' };
      return { label: 'good', tone: 'good' };
    }
    if (kind === 'twr') {
      if (v > 0) return { label: 'behind the benchmark', tone: 'attention' };
      return { label: 'ahead of the benchmark', tone: 'good' };
    }
    return { label: '', tone: 'neutral' };
  }

  /* ---- backtest engine (Portfolio Lab) -----------------------------------
     No new history is invented here, and the honesty of the numbers rests on
     three things being stated plainly:

       window     the app's own monthly span, monthSpan() — Oct 2024 onward.
                  There is no history before it, so no backtest can start
                  earlier than the portfolio itself.
       benchmark  the SPY monthly return path history() already carries, run
                  on the same deposit schedule, so it ends on the published
                  benchmark TWR.
       anchor     every ticker's path comes out of the same returnPath()
                  generator used by history(), pinned to ONE published annual
                  figure: a held name uses its own IRR; anything else uses
                  yield + 5-year dividend growth (a Gordon proxy).

     The month-to-month dispersion around that anchor is synthetic and seeded
     per ticker. It is what produces drawdown, volatility and Sharpe — so
     those are shape, not measurement, and (as on Analytics ▸ Metrics) they
     are only ever reported over the whole selected window. ------------- */
  const LAB_DISPERSION: Record<string, number> = { Stock: 1, ETF: 0.72, ETN: 1.15, Cash: 0 };

  let labCache: MarketRow[] | null = null;
  /* The screener universe plus the manually priced cash line, so "load my
     portfolio" can seat all 12 holdings and not 11. */
  function labSecurities(): MarketRow[] {
    if (labCache) return labCache;
    var rows = marketUniverse().slice();
    open().forEach(function (p) {
      if (p.assetClass !== 'Cash') return;
      rows.push({
        ticker: p.ticker, name: p.name, mono: p.mono, sector: p.sector, assetClass: p.assetClass,
        price: p.price, dps: Math.round(p.price * p.yieldPct) / 100, yieldPct: p.yieldPct,
        payoutRatio: null, dividendGrowth5Y: p.dividendGrowth5Y, streak: 0, capB: 0,
        frequency: p.frequency, exDay: 1, payDay: 1, cycle: 0,
        held: true, closed: false, shares: p.shares, position: p,
        rating: dividendRating(p), perPayment: annualGross(p) / 12, paymentsAYear: 12, isFund: false
      });
    });
    labCache = rows;
    return labCache;
  }
  function labSecurity(t: string): MarketRow | null {
    var m = labSecurities().filter(function (r) { return r.ticker === t; });
    return m.length ? m[0] : null;
  }

  function labAnchor(row: MarketRow) {
    var k = LAB_DISPERSION[row.assetClass] === undefined ? 1 : LAB_DISPERSION[row.assetClass];
    if (row.assetClass === 'Cash') {
      return { annual: row.yieldPct / 100, k: 0, source: 'money-market yield, held flat' };
    }
    var p = row.position;
    if (p && isFinite(p.irr)) return { annual: p.irr / 100, k: k, source: 'IRR on the live position' };
    var g = row.dividendGrowth5Y;
    g = (g === null || g === undefined || !isFinite(g)) ? 0 : g;
    return { annual: (row.yieldPct + Math.max(0, g)) / 100, k: k, source: 'yield + 5y dividend growth' };
  }

  /* Pull the path toward its own mean without moving where it lands. */
  function dampen(rets: number[], k: number, total: number) {
    if (k === 1) return rets;
    var n = rets.length, m = sum(rets) / n;
    var out = rets.map(function (r) { return m + (r - m) * k; });
    var prod = out.reduce(function (s, r) { return s * (1 + r); }, 1);
    var f = Math.pow((1 + total) / prod, 1 / n);
    return out.map(function (r) { return (1 + r) * f - 1; });
  }

  function labReturns(row: MarketRow, n: number) {
    var a = labAnchor(row);
    var total = Math.pow(1 + a.annual, n / 12) - 1;
    var raw = returnPath('lab:' + row.ticker, n, total);
    return { rets: dampen(raw, a.k, total), anchor: a, total: total };
  }

  /* Drawdown on a growth-of-$1 index, never on the money line: a portfolio
     taking contributions cannot fall as far as its own value chart implies. */
  function maxDrawdown(series: Array<{ index: number; key: string }>) {
    if (!series.length) return { pct: 0, peak: null, trough: null };
    let peak = series[0].index, peakKey = series[0].key, dd = 0;
    let trough: string | null = null, from: string | null = null;
    series.forEach(function (s) {
      if (s.index > peak) { peak = s.index; peakKey = s.key; }
      var d = peak ? (s.index / peak - 1) * 100 : 0;
      if (d < dd) { dd = d; trough = s.key; from = peakKey; }
    });
    return { pct: dd, peak: from, trough: trough };
  }

  /* The 12 open positions at their actual weights, summing to exactly 100. */
  function labMyPortfolio() {
    var T = totals(), o = open();
    var out = o.map(function (p) {
      return { ticker: p.ticker, weight: Math.round(p.value / T.value * 10000) / 100 };
    });
    var s = Math.round(sum(out.map(function (w) { return w.weight; })) * 100) / 100;
    if (out.length && s !== 100) {
      var big = out.slice().sort(function (a, b) { return b.weight - a.weight; })[0];
      big.weight = Math.round((big.weight + (100 - s)) * 100) / 100;
    }
    return out;
  }

  function backtest(cfg: Partial<LabScenario> = {}) {
    cfg = cfg || {};
    var span = monthSpan(), h = history();
    var i0 = Math.max(0, Math.min(span.length - 2, cfg.from === undefined ? 0 : cfg.from));
    var i1 = Math.max(i0 + 1, Math.min(span.length - 1, cfg.to === undefined ? span.length - 1 : cfg.to));
    var months = span.slice(i0, i1 + 1), n = months.length, hist = h.slice(i0, i1 + 1);
    var tax = constants.withholdingTax;
    var start = Math.max(0, Number(cfg.amount) || 0);
    var contrib = Math.max(0, Number(cfg.monthly) || 0);
    var reinvest = cfg.reinvest !== false;

    var picks = (cfg.weights || []).map(function (w) {
      var row = labSecurity(w.ticker);
      return row ? { row: row, w: Math.max(0, Number(w.weight) || 0) } : null;
    }).filter((x): x is { row: MarketRow; w: number } => x !== null && x.w > 0);
    var wsum = sum(picks.map(function (p) { return p.w; }));
    if (!picks.length || wsum <= 0 || (start <= 0 && contrib <= 0)) return null;

    /* Weights are normalised to run, whatever they sum to on screen — the
       screen flags the sum, the engine never silently drops the remainder. */
    var legs = picks.map(function (p) {
      var lab = labReturns(p.row, n);
      return {
        row: p.row, weight: p.w, share: p.w / wsum, rets: lab.rets, anchor: lab.anchor,
        value: start * p.w / wsum, contributed: start * p.w / wsum, dividends: 0
      };
    });
    var held = function () { return sum(legs.map(function (l) { return l.value; })); };

    var cash = 0, contributed = start, divGross = 0, divNet = 0;
    var twr = 1, btwr = 1, bench = start, rets = [], brets = [];
    const pts: BacktestPoint[] = [{
      key: 'Start', short: 'Start', isStart: true, value: start, invested: start,
      benchmark: start, twrIndex: 1, benchmarkIndex: 1, monthReturn: 0, benchmarkReturn: 0,
      dividends: 0, dividendsToDate: 0, cash: 0
    }];

    for (var j = 0; j < n; j++) {
      var mo = months[j], begin = held() + cash, mGross = 0, mNet = 0;
      legs.forEach(function (l) {
        l.value *= (1 + l.rets[j]);
        if (!l.row.yieldPct) return;
        var pays = l.row.frequency === 'Monthly' || (mo.monthIndex % 3) === (l.row.cycle || 0);
        if (!pays) return;
        var g = l.value * l.row.yieldPct / 100 / (l.row.frequency === 'Monthly' ? 12 : 4);
        var nt = g * (1 - tax);
        mGross += g; mNet += nt; l.dividends += nt;
        if (reinvest) l.value += nt;
      });
      if (!reinvest) cash += mNet;
      divGross += mGross; divNet += mNet;

      var r = begin > 0 ? (held() + cash) / begin - 1 : 0;
      twr *= (1 + r); rets.push(r * 100);
      var b = hist[j].benchmarkReturn / 100;
      btwr *= (1 + b); brets.push(hist[j].benchmarkReturn);
      bench = bench * (1 + b);

      if (contrib > 0) {
        legs.forEach(function (l) { l.value += contrib * l.share; l.contributed += contrib * l.share; });
        contributed += contrib; bench += contrib;
      }
      pts.push({
        key: mo.key, short: mo.short, year: mo.year, monthIndex: mo.monthIndex, isStart: false,
        value: held() + cash, invested: contributed, benchmark: bench,
        twrIndex: twr, benchmarkIndex: btwr,
        monthReturn: r * 100, benchmarkReturn: hist[j].benchmarkReturn,
        dividends: mNet, dividendsToDate: divNet, cash: cash
      });
    }

    var c = riskCalibration();
    var p = seriesStats(rets, c.rf), bsr = seriesStats(brets, c.rf);
    var last = pts[pts.length - 1], years = n / 12;
    var dd = maxDrawdown(pts.map(function (x) { return { key: x.key, index: x.twrIndex }; }));
    var bdd = maxDrawdown(pts.map(function (x) { return { key: x.key, index: x.benchmarkIndex }; }));

    return {
      months: pts,
      stats: {
        months: n, years: years,
        from: months[0].key, to: months[n - 1].key,
        fromShort: months[0].short, toShort: months[n - 1].short,
        start: start, monthly: contrib, contributed: contributed, contributions: contributed - start,
        finalValue: last.value, profit: last.value - contributed,
        twr: (twr - 1) * 100, cagr: (Math.pow(twr, 1 / years) - 1) * 100,
        moneyReturn: contributed ? (last.value - contributed) / contributed * 100 : 0,
        volatility: p.vol, sharpe: p.sharpe * c.sharpe, sortino: p.sortino * c.sortino,
        beta: betaOf(rets, brets) * c.beta,
        maxDrawdown: dd.pct, drawdownPeak: dd.peak, drawdownTrough: dd.trough,
        downMonths: p.downMonths,
        dividendsGross: divGross, dividendsNet: divNet, cash: cash,
        incomeYield: last.value && years ? divGross / years / last.value * 100 : 0,
        riskFree: c.rf * 100, reinvest: reinvest, weightSum: wsum
      },
      benchmark: {
        label: constants.benchmark,
        twr: (btwr - 1) * 100, cagr: (Math.pow(btwr, 1 / years) - 1) * 100,
        finalValue: bench, volatility: bsr.vol,
        sharpe: bsr.sharpe * c.sharpe, sortino: bsr.sortino * c.sortino, beta: 1,
        maxDrawdown: bdd.pct, downMonths: bsr.downMonths,
        moneyReturn: contributed ? (bench - contributed) / contributed * 100 : 0
      },
      legs: legs.map(function (l) {
        return {
          ticker: l.row.ticker, name: l.row.name, mono: l.row.mono, sector: l.row.sector,
          assetClass: l.row.assetClass, held: !!l.row.held,
          weight: l.weight, share: l.share * 100,
          value: l.value, contributed: l.contributed, dividends: l.dividends,
          growth: l.contributed ? (l.value - l.contributed) / l.contributed * 100 : 0,
          anchorAnnual: l.anchor.annual * 100, anchorSource: l.anchor.source,
          yieldPct: l.row.yieldPct, frequency: l.row.frequency
        };
      }),
      window: { from: months[0].key, to: months[n - 1].key, months: n, first: i0, last: i1, span: span.length }
    };
  }

  /* ---- price technicals (Find the Dip) -----------------------------------
     52-week high/low and the 50/200-session moving averages all come from ONE
     generated path per ticker, so they cannot contradict each other: a name
     sitting near its high is arithmetically above its own averages.

     The path is 252 sessions (about a trading year) of a seeded walk whose
     drift is pinned to the same published annual figure the Lab uses — the
     position's IRR where it is held, yield + 5-year dividend growth where it
     is not — and it is then scaled by ONE constant so the last session equals
     the current price. Scaling uniformly (rather than tapering the
     correction) leaves every ratio in the path intact, which is what keeps
     price-vs-high and price-vs-average consistent. Dispersion is by asset
     class, with the T-bill ETF pinned near flat as everywhere else. ---- */
  var TA_SESSIONS = 252;
  const TA_VOL: Record<string, number> = { Stock: 1, ETF: 0.62, ETN: 1.05, Cash: 0 };
  const TA_VOL_TICKER: Record<string, number> = { BIL: 0.06, GLDI: 0.85, SLVO: 1.25, NVDA: 1.55, AMZN: 1.15, AGNC: 0.7 };
  const taCache: Record<string, Technicals> = {};

  function sessionDate(back: number) {
    var dt = new Date(constants.today.year, constants.today.monthIndex, todayDay());
    dt.setDate(dt.getDate() - Math.round(back * 7 / 5));
    return dt.getDate() + ' ' + MONTHS[dt.getMonth()] + ' ' + dt.getFullYear();
  }

  function technicals(row: MarketRow): Technicals {
    if (taCache[row.ticker]) return taCache[row.ticker];
    var a = labAnchor(row);
    var vol = TA_VOL_TICKER[row.ticker];
    if (vol === undefined) vol = TA_VOL[row.assetClass] === undefined ? 1 : TA_VOL[row.assetClass];
    var daily = 0.0105 * vol;
    var drift = Math.pow(1 + Math.max(-0.6, a.annual), 1 / TA_SESSIONS) - 1;
    var rnd = seeded('ta' + row.ticker), v = 1, raw = [];
    for (var i = 0; i < TA_SESSIONS; i++) {
      v = v * (1 + drift + (rnd() - 0.5) * 2 * daily);
      raw.push(v);
    }
    var k = row.price / raw[TA_SESSIONS - 1];
    var px = raw.map(function (x) { return x * k; });

    var high = px[0], low = px[0], hiAt = 0, loAt = 0;
    px.forEach(function (x, i) {
      if (x > high) { high = x; hiAt = i; }
      if (x < low) { low = x; loAt = i; }
    });
    var mean = function (n: number) {
      var s = px.slice(TA_SESSIONS - n);
      return sum(s) / s.length;
    };
    var ma50 = mean(50), ma200 = mean(200);
    var price = row.price;
    var t: Technicals = {
      sessions: TA_SESSIONS, series: px, price: price,
      high: high, low: low,
      highDate: sessionDate(TA_SESSIONS - 1 - hiAt), lowDate: sessionDate(TA_SESSIONS - 1 - loAt),
      highSessionsAgo: TA_SESSIONS - 1 - hiAt, lowSessionsAgo: TA_SESSIONS - 1 - loAt,
      ma50: ma50, ma200: ma200,
      fromHigh: (price / high - 1) * 100,
      fromLow: (price / low - 1) * 100,
      from50: (price / ma50 - 1) * 100,
      from200: (price / ma200 - 1) * 100,
      rangePos: high > low ? (price - low) / (high - low) * 100 : 100,
      trendUp: ma50 >= ma200,
      maSpread: (ma50 / ma200 - 1) * 100,
      anchorSource: a.source, anchorAnnual: a.annual * 100
    };
    /* the invariant this screen rests on */
    t.consistent = t.fromHigh <= 0.0001 && t.fromLow >= -0.0001
      && !(t.fromHigh > -1 && t.from200 < -1);
    taCache[row.ticker] = t;
    return t;
  }

  /* Every open name in the universe with its technicals attached. Closed
     positions are dropped — a sold holding has no dip to buy. */
  function dipRows() {
    return marketUniverse().filter(function (r) { return !r.closed; }).map(function (r) {
      return Object.assign({}, r, { tech: technicals(r) });
    }).sort(function (a, b) { return a.tech.fromHigh - b.tech.fromHigh; });
  }


  return { marketUniverse, universeSectors, universeStats, marketCalendarMonth, marketCalendarYear,
    fundComposition, lookThrough, breakdown, incomeBreakdown, dividendRating,
    riskFreeRate, seriesStats, betaOf, riskCalibration, riskStats, riskVerdict,
    labSecurities, labSecurity, labAnchor, labReturns, dampen, maxDrawdown, labMyPortfolio, backtest,
    technicals, dipRows, sessionDate };
}
