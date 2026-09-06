/**
 * Transaction ledger and corporate actions — ported from snowline-data.js.
 *
 * The ledger is the single generator of trade lots. `transactionsFor()` is a
 * view of it, so the holdings drawer and the Transactions screen cannot drift
 * apart.
 *
 * Invariants, checked by `ledgerReconciliation()`:
 *   buy rows per ticker  sum to the position's shares and costTotal
 *   sell rows            sum to soldShares / soldProceeds
 *   income rows          sum to each position's dividendsReceived, and so to
 *                        the lifetime total
 *
 * One caveat carried over from the prototype: income rows are laid out per
 * position, stepping back from today at the holding's own payment frequency.
 * They reconcile per holding and in total, but an individual month will not
 * match dividendHistory's month total, which is what the value and report
 * charts are built from. Fees are charged on trades and do not enter the
 * cost basis.
 */

import type { CorporateAction, LedgerRow, Lot, Position } from './types.js';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The dates the portfolio's purchases are laid out on. */
export const BUY_DATES = ['12 Nov 2024', '18 Feb 2025', '07 Jul 2025', '21 Jan 2026', '14 Apr 2026'];

const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

export function parseDate(s: string): { d: number; m: number; y: number } {
  const p = s.split(' ');
  return { d: +p[0], m: MONTHS.indexOf(p[1]), y: +p[2] };
}

export function serial(s: string): number {
  const p = parseDate(s);
  return p.y * 10000 + p.m * 100 + p.d;
}

/** Commission: 9 basis points, capped at $4.95. */
export function tradeFee(total: number): number {
  return Math.round(Math.min(4.95, total * 0.0009) * 100) / 100;
}

export function roundTo(v: number, d: number): number {
  const f = Math.pow(10, d);
  return Math.round(v * f) / f;
}

/**
 * A deterministic PRNG seeded from a string, so "random" detail data is
 * stable across runs. Ported exactly — changing it changes every generated
 * lot and price series.
 */
export function seeded(s: string): () => number {
  let x = 7;
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) % 2147483647;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

/**
 * How far a single lot's price may sit from the position's average cost.
 * A money-market fund is pinned at par and a T-bill ETF barely moves, so
 * those get a band near zero; equities and ETNs get a real one.
 */
export function priceBand(p: Position): number {
  if (p.assetClass === 'Cash') return 0;
  if (p.ticker === 'BIL') return 0.015;
  if (p.assetClass === 'ETN') return 0.12;
  if (p.assetClass === 'ETF') return 0.08;
  return 0.14;
}

export function priceDecimals(p: Position): number {
  return p.costPerShare < 5 ? 4 : 2;
}

/**
 * The ledger half of the engine. Kept separate from the portfolio maths
 * because it owns its own cache and a lot of generation detail.
 */
export class LedgerEngine {
  private cache: LedgerRow[] | null = null;

  constructor(
    private readonly positions: Position[],
    private readonly corporateActions: CorporateAction[],
    private readonly withholdingTax: number,
    private readonly today: { year: number; monthIndex: number; label: string },
    private readonly transactions: LedgerRow[] = []
  ) {}

  private byTicker(t: string): Position | undefined {
    return this.positions.find((p) => p.ticker === t);
  }

  /* ---- corporate actions ------------------------------------------------ */

  corporateActionsFor(ticker: string): CorporateAction[] {
    return this.corporateActions.filter((e) => e.ticker === ticker);
  }

  /**
   * Cumulative share ratio applied to `ticker` strictly AFTER `date`. A lot
   * bought before a 4:1 split is divided by 4 to show its pre-split basis.
   */
  splitFactorAfter(ticker: string, date: string): number {
    let f = 1;
    const s = serial(date);
    this.corporateActions.forEach((e) => {
      if (e.ticker !== ticker || e.status !== 'Completed' || e.ratio === 1) return;
      if (serial(e.date) > s) f *= e.ratio;
    });
    return f;
  }

  /** Total basis reduction booked against a ticker (return of capital). */
  basisAdjustFor(ticker: string): number {
    return (
      Math.round(
        sum(
          this.corporateActions
            .filter((e) => e.ticker === ticker && e.status === 'Completed')
            .map((e) => e.basisAdjust || 0)
        ) * 100
      ) / 100
    );
  }

  /**
   * Each event with the before/after figures the log displays. Shares are read
   * back through the split chain; basis before is the basis after plus
   * everything booked from this event onwards.
   */
  corporateActionLog() {
    return this.corporateActions
      .slice()
      .sort((a, b) => serial(b.date) - serial(a.date))
      .map((e) => {
        const p = this.byTicker(e.ticker)!;
        const held = p.status === 'sold' ? p.soldShares! : p.shares;
        const pending = e.status !== 'Completed';

        // Shares as they stood immediately after this event, then before it.
        const after = pending ? held : held / this.splitFactorAfter(e.ticker, e.date);
        const before = pending ? held : after / e.ratio;

        // Basis after this event: today's basis plus every later reduction.
        const laterCuts = sum(
          this.corporateActions
            .filter((x) => x.ticker === e.ticker && x.status === 'Completed' && serial(x.date) > serial(e.date))
            .map((x) => x.basisAdjust || 0)
        );
        const basisAfter = pending ? p.costTotal : p.costTotal + laterCuts;
        const basisBefore = basisAfter + (pending ? 0 : e.basisAdjust || 0);

        return {
          id: e.id,
          date: e.date,
          serial: serial(e.date),
          type: e.type,
          status: e.status,
          ticker: e.ticker,
          displayTicker: e.fromTicker ? `${e.fromTicker} → ${e.ticker}` : e.ticker,
          name: p.name,
          mono: p.mono,
          assetClass: p.assetClass,
          headline: e.headline,
          detail: e.detail,
          ratio: e.ratio,
          ratioLabel: e.ratioLabel || null,
          sharesBefore: before,
          sharesAfter: after,
          sharesChanged: e.ratio !== 1,
          basisBefore,
          basisAfter,
          basisChanged: (e.basisAdjust || 0) > 0,
          basisAdjust: e.basisAdjust || 0,
          perShareBefore: before ? basisBefore / before : 0,
          perShareAfter: after ? basisAfter / after : 0,
          cash: e.cash || 0,
          pending
        };
      });
  }

  corporateActionStats() {
    const log = this.corporateActionLog();
    const types: Record<string, number> = {};
    log.forEach((e) => {
      types[e.type] = (types[e.type] || 0) + 1;
    });
    return {
      count: log.length,
      completed: log.filter((e) => !e.pending).length,
      pending: log.filter((e) => e.pending).length,
      tickers: log.map((e) => e.ticker).filter((t, i, a) => a.indexOf(t) === i),
      types: Object.keys(types).map((t) => ({ type: t, count: types[t] })),
      basisReduced: sum(log.map((e) => e.basisAdjust)),
      cash: sum(log.map((e) => e.cash)),
      latest: log.filter((e) => !e.pending)[0] || null,
      next: log.filter((e) => e.pending).slice(-1)[0] || null
    };
  }

  /* ---- lots -------------------------------------------------------------- */

  /**
   * Lots reconcile exactly: shares sum to the position's share count and the
   * amounts to its cost basis. Prices are drawn inside the instrument's band
   * and the closing lot is solved for — if that solution would fall outside
   * the band, the earlier deviations are damped until it fits.
   */
  lotsFor(p: Position): Lot[] {
    if (p.status === 'sold') {
      return [
        {
          date: BUY_DATES[1],
          type: 'Buy',
          shares: p.soldShares!,
          price: roundTo(p.soldCost! / p.soldShares!, priceDecimals(p)),
          total: p.soldCost!
        },
        {
          date: p.soldDate!,
          type: 'Sell',
          shares: p.soldShares!,
          price: roundTo(p.soldProceeds! / p.soldShares!, priceDecimals(p)),
          total: p.soldProceeds!
        }
      ];
    }

    const rnd = seeded('tx' + p.ticker);
    const n = p.shares > 50 ? 3 : 2;
    const band = priceBand(p);
    const dec = priceDecimals(p);

    // Lots are written against the ORIGINAL purchase cost — any return of
    // capital reduced the stored basis after the fact.
    const cut = this.basisAdjustFor(p.ticker);
    const costTotal = roundTo(p.costTotal + cut, 2);
    const costPerShare = costTotal / p.shares;

    const shares: number[] = [];
    let used = 0;
    for (let i = 0; i < n - 1; i++) {
      const sh = roundTo(p.shares * (0.28 + rnd() * 0.22), 6);
      shares.push(sh);
      used += sh;
    }
    shares.push(roundTo(p.shares - used, 6));

    const dev: number[] = [];
    for (let i = 0; i < n - 1; i++) dev.push((rnd() * 2 - 1) * band);

    const closingDeviation = (scale: number) => {
      let cost = 0;
      for (let j = 0; j < n - 1; j++) cost += shares[j] * costPerShare * (1 + dev[j] * scale);
      return (costTotal - cost) / (shares[n - 1] * costPerShare) - 1;
    };

    let scale = 1;
    let guard = 0;
    while (Math.abs(closingDeviation(scale)) > band && scale > 0.002 && guard++ < 40) scale *= 0.7;

    const out: Lot[] = [];
    let costLeft = costTotal;
    for (let i = 0; i < n - 1; i++) {
      const price = roundTo(costPerShare * (1 + dev[i] * scale), dec);
      const total = roundTo(shares[i] * price, 2);
      out.push({ date: BUY_DATES[i], type: 'Buy', shares: shares[i], price, total });
      costLeft = roundTo(costLeft - total, 2);
    }
    out.push({
      date: BUY_DATES[n - 1],
      type: 'Buy',
      shares: shares[n - 1],
      price: roundTo(costLeft / shares[n - 1], dec),
      total: costLeft
    });

    // Restate every lot bought before a split onto its pre-split basis: the
    // share count divides by the ratio, the price multiplies by it, and the
    // cash the trade actually cost is untouched.
    return out.map((l) => {
      const f = this.splitFactorAfter(p.ticker, l.date);
      if (f === 1) return l;
      return {
        date: l.date,
        type: l.type,
        shares: roundTo(l.shares / f, 6),
        price: roundTo(l.price * f, dec),
        total: l.total,
        presplit: true
      };
    });
  }

  /** Income rows for one position, summing exactly to dividendsReceived. */
  incomeRowsFor(p: Position) {
    if (!p.dividendsReceived) return [];
    const lots = this.lotsFor(p);
    const first = parseDate(lots[0].date);
    const last =
      p.status === 'sold'
        ? parseDate(p.soldDate!)
        : { y: this.today.year, m: this.today.monthIndex, d: 28 };

    const step = p.frequency === 'Monthly' ? 1 : 3;
    const day = p.frequency === 'Monthly' ? 4 : 22;

    const slots: Array<{ y: number; m: number }> = [];
    let y = first.y;
    let m = first.m + step;
    while (m > 11) {
      m -= 12;
      y += 1;
    }
    while (y * 12 + m <= last.y * 12 + last.m) {
      if (!(y === last.y && m === last.m && day > last.d)) slots.push({ y, m });
      m += step;
      while (m > 11) {
        m -= 12;
        y += 1;
      }
    }
    if (!slots.length) slots.push({ y: last.y, m: last.m });

    const each = Math.round((p.dividendsReceived / slots.length) * 100) / 100;
    let running = 0;

    return slots.map((s, i) => {
      const netAmt =
        i === slots.length - 1 ? Math.round((p.dividendsReceived - running) * 100) / 100 : each;
      running += netAmt;
      const grossAmt = Math.round((netAmt / (1 - this.withholdingTax)) * 100) / 100;
      return {
        date: `${day} ${MONTHS[s.m]} ${s.y}`,
        type: 'Dividends' as const,
        shares: p.shares,
        price: p.shares ? netAmt / p.shares : 0,
        total: netAmt,
        gross: grossAmt,
        tax: Math.round((grossAmt - netAmt) * 100) / 100
      };
    });
  }

  /* ---- the ledger -------------------------------------------------------- */

  ledger(): LedgerRow[] {
    if (this.cache) return this.cache;

    const rows: Omit<LedgerRow, 'id'>[] = [];
    this.positions.forEach((p) => {
      this.lotsFor(p).forEach((l) => {
        rows.push({
          kind: 'trade',
          operation: l.type,
          ticker: p.ticker,
          name: p.name,
          mono: p.mono,
          currency: p.currency,
          date: l.date,
          shares: l.shares,
          price: l.price,
          amount: l.total,
          fee: tradeFee(l.total),
          tax: 0,
          signed: l.type === 'Buy' ? -l.total : l.total,
          note: l.type === 'Sell' ? 'Position closed' : ''
        });
      });
      this.incomeRowsFor(p).forEach((d) => {
        rows.push({
          kind: 'income',
          operation: 'Dividends',
          ticker: p.ticker,
          name: p.name,
          mono: p.mono,
          currency: p.currency,
          date: d.date,
          shares: d.shares,
          price: d.price,
          amount: d.total,
          fee: 0,
          tax: d.tax,
          signed: d.total,
          note: `${p.frequency} distribution`
        });
      });
    });

    rows.sort((a, b) => {
      const s = serial(b.date) - serial(a.date);
      return s !== 0 ? s : a.ticker.localeCompare(b.ticker);
    });

    this.cache = [...rows.map((r, i) => ({ id: `tx${rows.length - i}`, ...r })), ...this.transactions]
      .sort((a, b) => serial(b.date) - serial(a.date) || a.ticker.localeCompare(b.ticker));
    return this.cache;
  }

  ledgerTotals(rows?: LedgerRow[]) {
    const r = rows || this.ledger();
    const pick = (f: (x: LedgerRow) => boolean) => sum(r.filter(f).map((x) => x.amount));
    return {
      buy: pick((x) => x.operation === 'Buy'),
      sell: pick((x) => x.operation === 'Sell'),
      income: sum(r.filter(x => x.kind === 'income').map(x => x.signed)),
      fee: sum(r.map((x) => x.fee)),
      tax: sum(r.map((x) => x.tax)),
      count: r.length
    };
  }

  /**
   * Proof that the generated rows still add up to the stored positions.
   * Buy shares are re-adjusted through each ticker's split chain and any
   * return of capital is subtracted from the original purchase cost, so a
   * corporate action can never silently break the reconciliation.
   */
  ledgerReconciliation() {
    return this.positions.map((p) => {
      // Reconcile the opening snapshot only; user entries are replayed separately.
      const mine = this.ledger().filter((r) => r.ticker === p.ticker && r.updateCash === undefined);
      const buys = mine.filter((r) => r.operation === 'Buy');
      const inc = mine.filter((r) => r.kind === 'income');
      const adjShares = sum(buys.map((r) => r.shares * this.splitFactorAfter(p.ticker, r.date)));
      const cut = p.status === 'sold' ? 0 : this.basisAdjustFor(p.ticker);
      return {
        ticker: p.ticker,
        sharesDelta:
          Math.round((adjShares - (p.status === 'sold' ? p.soldShares! : p.shares)) * 1e5) / 1e5,
        costDelta:
          Math.round(
            (sum(buys.map((r) => r.amount)) - cut - (p.status === 'sold' ? p.soldCost! : p.costTotal)) * 100
          ) / 100,
        incomeDelta: Math.round((sum(inc.map((r) => r.amount)) - p.dividendsReceived) * 100) / 100,
        splitAdjusted: this.splitFactorAfter(p.ticker, BUY_DATES[0]) !== 1,
        basisAdjust: cut
      };
    });
  }

  /** Allocate today's shares to the newest buys: sales consume oldest lots (FIFO).
   * Quantities use the current, split-adjusted share basis rather than mixing
   * pre-split purchase units with the current holding balance.
   */
  remainingShares(positions: Pick<Position, 'ticker' | 'status' | 'shares'>[]): Record<string, number> {
    const available = new Map(positions.map(p => [p.ticker, p.status === 'open' ? p.shares : 0]));
    const remaining: Record<string, number> = {};
    // Reverse first so entries added later on the same day receive shares first.
    const rows = this.ledger().slice().reverse().sort((a, b) => serial(b.date) - serial(a.date));
    for (const row of rows) {
      if (row.operation !== 'Buy') continue;
      const balance = Math.max(0, available.get(row.ticker) ?? 0);
      const quantity = row.shares * this.splitFactorAfter(row.ticker, row.date);
      remaining[row.id] = Math.min(balance, quantity);
      available.set(row.ticker, Math.max(0, balance - remaining[row.id]));
    }
    return remaining;
  }

  /** Trade rows for one ticker, oldest first. */
  transactionsFor(ticker: string) {
    return this.ledger()
      .filter((r) => r.ticker === ticker && r.kind === 'trade')
      .slice()
      .reverse()
      .map((r) => ({ date: r.date, type: r.operation, shares: r.shares, price: r.price, total: r.amount }));
  }

  /** Price history ending exactly at the position's current price. */
  priceSeries(ticker: string, n = 60): number[] {
    const p = this.byTicker(ticker);
    if (!p) return [];
    const rnd = seeded('px' + ticker);
    let v = p.costPerShare || p.price || 1;
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      v = v * (1 + (rnd() - 0.47) * 0.045);
      out.push(v);
    }
    const last = out[n - 1] || 1;
    const k = (p.price || 1) / last;
    return out.map((x, i) => x * (1 + (k - 1) * (i / (n - 1))));
  }
}

/**
 * Cross-listings for the ticker combobox. Only the US line is a real
 * position; the others are the same company on other exchanges, which the
 * portfolio does not hold.
 */
export const EXCHANGES = [
  { code: 'US', suffix: '', cur: '$', label: 'NASDAQ / NYSE' },
  { code: 'AR', suffix: '.BA', cur: 'ARS', label: 'Buenos Aires' },
  { code: 'CA', suffix: '.NE', cur: 'CA$', label: 'Cboe Canada' },
  { code: 'MX', suffix: '.MX', cur: 'Mex$', label: 'Bolsa Mexicana' }
];
