// @ts-nocheck
/** Presentation and chart geometry from AnalyticsDividends.dc.html; data comes from the core engine. */
import { Presenter } from "./presenter.svelte";
export default class AnalyticsDividendsPresenter extends Presenter {
  state = {
    menu: null, hover: null, ratingHover: null,
    ypMetric: 'Yield (%)', ypGroup: 'Holdings', growthGroup: 'Holdings'
  };

  /* Roll-up of the paying holdings by sector.
       value  — market value of the category
       avg    — value-weighted average of `rateOf` (a rate: %, CAGR), which is
                what makes a category rate comparable to a holding rate
       sum    — plain total of `amountOf` (an amount: $), never weighted */
  byCategory(list, rateOf, amountOf) {
    const map = {}, order = [];
    list.forEach((p) => {
      if (!map[p.sector]) { map[p.sector] = { name: p.sector, value: 0, weighted: 0, sum: 0, members: [] }; order.push(p.sector); }
      const g = map[p.sector];
      g.value += p.value;
      g.weighted += rateOf(p) * p.value;
      g.sum += amountOf ? amountOf(p) : 0;
      g.members.push(p);
    });
    return order.map((k) => {
      const g = map[k];
      return { name: g.name, value: g.value, avg: g.value ? g.weighted / g.value : 0, sum: g.sum, members: g.members };
    });
  }

  componentDidMount() {
    this.doc = () => { if (this.state.menu) this.setState({ menu: null }); };
    document.addEventListener('click', this.doc);

  }
  componentWillUnmount() { if (this.doc) document.removeEventListener('click', this.doc); }

  /* geometry for one bar row; vals may be negative (zero line handled by caller) */
  geom(count, left, right, top, base, bw) {
    const slot = (right - left) / count;
    const out = [];
    for (let i = 0; i < count; i++) {
      const sx = left + i * slot;
      out.push({
        i: i, sx: sx.toFixed(1), sw: slot.toFixed(1), cx: (sx + slot / 2).toFixed(1),
        x: (sx + (slot - bw) / 2).toFixed(1), w: bw, slot: slot
      });
    }
    return out;
  }
  /* axis max that divides evenly by the tick count, so labels read round */
  niceMax(raw, steps) {
    const units = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    for (let i = 0; i < units.length; i++) {
      if (units[i] * steps >= raw) return units[i] * steps;
    }
    return Math.ceil(raw / steps) * steps;
  }
  /* Smallest round ceiling above `raw` that divides into `steps` round ticks. */
  niceMax(raw, steps) {
    if (!(raw > 0)) return steps;
    const mag = Math.pow(10, Math.floor(Math.log10(raw / steps)));
    const cands = [1, 2, 2.5, 5, 10, 20, 25];
    for (let m = mag; m <= mag * 1000; m *= 10) {
      for (let i = 0; i < cands.length; i++) {
        const step = cands[i] * m;
        if (step * steps >= raw) return step * steps;
      }
    }
    return Math.ceil(raw / steps) * steps;
  }
  grid(min, max, steps, base, top, fmt) {
    const out = [];
    for (let i = 0; i <= steps; i++) {
      const v = min + (max - min) * (i / steps);
      const y = base - (base - top) * (i / steps);
      out.push({ y: y.toFixed(1), top: (y / 154 * 100).toFixed(2) + '%', label: fmt(v) });
    }
    return out;
  }

  chartTog(id) {
    return (e) => { e.stopPropagation(); this.setState((s) => ({ menu: s.menu === id ? null : id })); };
  }
  opts(id, list, cur, key) {
    return list.map((o) => ({
      label: o, check: o === cur ? 1 : 0,
      onClick: (e) => { e.stopPropagation(); const p = { menu: null }; p[key] = o; this.setState(p); }
    }));
  }
  hoverOf(id, i) {
    return {
      hop: this.state.hover && this.state.hover.id === id && this.state.hover.i === i ? 1 : 0,
      onEnter: () => this.setState({ hover: { id: id, i: i } }),
      onLeave: () => this.setState({ hover: null })
    };
  }
  isHover(id, i) { return this.state.hover && this.state.hover.id === id && this.state.hover.i === i; }
  tipLeft(cx) { return Math.min(84, Math.max(18, cx / 624 * 100)) + '%'; }

  renderVals() {
    const st = this.state;
    const I = {
      bars: 'M4 20V10M10 20V4M16 20v-7M22 20H2', table: 'M3 5h18v14H3V5Zm0 5h18M9 10v9',
      home: 'M4 11l8-7 8 7v9H4v-9Zm5 9v-6h6v6',
      scale: 'M12 4v16M6 8l-3 6h6l-3-6Zm12 0l-3 6h6l-3-6ZM5 8h14', dots: 'M5 12h.01M12 12h.01M19 12h.01'
    };
    const base = {
      stop: (e) => e.stopPropagation(),
      tabRows: [
        { label: 'Dashboard', d: I.home, href: '/', color: 'var(--t3)' },
        { label: 'Analytics', d: I.bars, href: '/analytics', color: 'var(--accent)' },
        { label: 'Portfolio', d: I.table, href: '/portfolio/holdings', color: 'var(--t3)' },
        { label: 'Tools', d: I.scale, href: '/tools/rebalancing', color: 'var(--t3)' }
      ]
    };
    if (!this.data) return base;

    const D = this.data, F = D.fmt, K = D.constants, T = D.totals();
    const payers = D.open().filter((p) => p.yieldPct > 0);
    const charts = [];

    /* ---- 1 · Yield / Payout, per holding, sorted descending -------------- */
    const ypIsYield = st.ypMetric === 'Yield (%)';
    const ypByCat = st.ypGroup === 'Categories';
    let ypSorted, ypVals, ypPayouts;
    if (ypByCat) {
      const cats = this.byCategory(payers, (p) => p.yieldPct, (p) => D.holding(p).annualGross);
      ypSorted = cats.map((c) => ({
        ticker: c.name, name: c.members.length + (c.members.length === 1 ? ' holding' : ' holdings') + ' · ' + c.members.map((m) => m.ticker).join(', '),
        yieldPct: c.value ? c.sum / c.value * 100 : 0, value: c.value, members: c.members,
        payoutRatio: (() => {
          const withPayout = c.members.filter((m) => m.payoutRatio !== null);
          if (!withPayout.length) return null;
          const v = withPayout.reduce((s, m) => s + m.value, 0);
          return v ? withPayout.reduce((s, m) => s + m.payoutRatio * m.value, 0) / v : null;
        })(),
        frequency: c.members.every((m) => m.frequency === c.members[0].frequency) ? c.members[0].frequency : 'Mixed',
        cat: c
      })).sort((a, b) => (ypIsYield ? b.yieldPct - a.yieldPct : b.cat.sum - a.cat.sum));
      ypVals = ypSorted.map((c) => ypIsYield ? c.yieldPct : c.cat.sum);
      ypPayouts = ypSorted.map((c) => ypIsYield && c.payoutRatio !== null ? c.payoutRatio : 0);
    } else {
      ypSorted = payers.slice().sort((a, b) => {
        const av = ypIsYield ? a.yieldPct : D.holding(a).annualGross;
        const bv = ypIsYield ? b.yieldPct : D.holding(b).annualGross;
        return bv - av;
      });
      ypVals = ypSorted.map((p) => ypIsYield ? p.yieldPct : D.holding(p).annualGross);
      ypPayouts = ypSorted.map((p) => ypIsYield && p.payoutRatio !== null ? p.payoutRatio : 0);
    }
    const ypMaxRaw = Math.max.apply(null, ypVals.concat(ypPayouts));
    const ypMax = this.niceMax(ypMaxRaw, 4);
    const ypG = this.geom(ypSorted.length, 46, 616, 10, 138, ypByCat ? 46 : 30);
    charts.push({
      id: 'yp', span: 'span 2', title: 'Yield / Payout',
      subtitle: ypByCat
        ? ypSorted.length + ' categories · ' + (ypIsYield ? 'value-weighted yield' : 'total income')
        : ypSorted.length + ' paying holdings · sorted by ' + (ypIsYield ? 'yield' : 'income'),
      legend: ypIsYield ? [{ label: 'Yield', color: 'var(--accent)' }, { label: 'Payout ratio marker', color: 'var(--t1)' }] : [{ label: 'Gross income', color: 'var(--accent)' }],
      controls: [
        { value: st.ypMetric, open: st.menu === 'ypm', onToggle: this.chartTog('ypm'), options: this.opts('ypm', ['Yield (%)', 'Annual income ($)'], st.ypMetric, 'ypMetric') },
        { value: st.ypGroup, open: st.menu === 'ypg', onToggle: this.chartTog('ypg'), options: this.opts('ypg', ['Holdings', 'Categories'], st.ypGroup, 'ypGroup') }
      ],
      grid: this.grid(0, ypMax, 4, 138, 10, (v) => ypIsYield ? F.num(v, 0) + '%' : '$' + F.num(v, 0)),
      bars: ypSorted.map((p, i) => {
        const v = ypVals[i];
        const h = v / ypMax * 128;
        const payoutY = ypIsYield && p.payoutRatio !== null ? 138 - (p.payoutRatio / ypMax * 128) : null;
        const g = ypG[i];
        const label = ypByCat ? (p.ticker.length > 13 ? p.ticker.slice(0, 12) + '…' : p.ticker) : p.ticker;
        return Object.assign({
          label: label, labelColor: 'var(--t3)',
          parts: [{ x: g.x, y: (138 - h).toFixed(1), w: g.w, h: h.toFixed(1), fill: 'var(--accent)' }],
          marker: payoutY !== null,
          markerX1: (parseFloat(g.x) - 4).toFixed(1), markerX2: (parseFloat(g.x) + g.w + 4).toFixed(1),
          markerY: payoutY === null ? 0 : payoutY.toFixed(1),
          sx: g.sx, sw: g.sw
        }, this.hoverOf('yp', i));
      }),
      tip: (() => {
        const i = st.hover && st.hover.id === 'yp' ? st.hover.i : null;
        if (i === null || !ypSorted[i]) return null;
        const p = ypSorted[i];
        if (ypByCat) {
          const income = p.cat.sum;
          const catYield = p.value ? income / p.value * 100 : 0;
          return {
            title: p.ticker, headline: ypIsYield ? F.pct(catYield) : F.money(income),
            sub: ypIsYield ? F.money(income) + ' gross a year' : F.pct(catYield) + ' yield on ' + F.money(p.value),
            rows: p.cat.members.slice().sort((a, b) => b.yieldPct - a.yieldPct).map((m) => ({
              label: m.ticker, value: ypIsYield ? F.pct(m.yieldPct) : F.money(D.holding(m).annualGross), color: 'var(--accent)'
            })),
            footer: F.money(p.value) + ' across ' + p.cat.members.length + (p.cat.members.length === 1 ? ' holding' : ' holdings'),
            footerTone: 'pos'
          };
        }
        const h = D.holding(p);
        return {
          title: p.ticker + ' · ' + p.name,
          headline: ypIsYield ? F.pct(p.yieldPct) : F.money(h.annualGross),
          sub: ypIsYield ? F.money(h.annualGross) + ' gross a year' : F.pct(p.yieldPct) + ' forward yield',
          rows: [
            { label: 'Yield on cost', value: F.pct(h.yieldOnCost), color: 'var(--accent-3)' },
            { label: 'Payout ratio', value: p.payoutRatio === null ? 'option income' : F.pct(p.payoutRatio, 1), color: 'var(--t1)' },
            { label: 'Frequency', value: p.frequency, color: 'var(--grey-series)' }
          ],
          footer: p.payoutRatio === null ? 'Distribution comes from option premium, not earnings' : (p.payoutRatio > 75 ? 'Little headroom left in earnings' : 'Covered by earnings'),
          footerTone: p.payoutRatio !== null && p.payoutRatio > 75 ? 'neg' : 'pos'
        };
      })(),
      tipLeft: st.hover && st.hover.id === 'yp' && ypG[st.hover.i] ? this.tipLeft(parseFloat(ypG[st.hover.i].cx)) : '50%',
      footer: ypIsYield ? 'The dark tick marks each holding’s payout ratio on the same axis — where it sits far above the bar, the dividend leans on something other than earnings.' : ''
    });

    /* ---- 2 · Average annual growth -------------------------------------- */
    const grWithHistory = payers.filter((p) => p.dividendGrowth5Y !== null);
    const grByCat = st.growthGroup === 'Categories';
    let grSorted;
    if (grByCat) {
      grSorted = this.byCategory(grWithHistory, (p) => p.dividendGrowth5Y).map((c) => ({
        ticker: c.name, dividendGrowth5Y: c.avg, value: c.value, cat: c
      })).sort((a, b) => b.dividendGrowth5Y - a.dividendGrowth5Y);
    } else {
      grSorted = grWithHistory.slice().sort((a, b) => b.dividendGrowth5Y - a.dividendGrowth5Y);
    }
    const grMax = 20, grMin = -20;
    const grZero = 138 - (0 - grMin) / (grMax - grMin) * 128;
    const grG = this.geom(grSorted.length, 46, 616, 10, 138, grByCat ? 48 : 34);
    charts.push({
      id: 'gr', span: 'span 2', title: 'Average annual growth',
      subtitle: 'five-year dividend CAGR · ' + (grByCat
        ? grSorted.length + ' categories, value-weighted'
        : grSorted.length + ' holdings with history'),
      legend: [],
      controls: [{ value: st.growthGroup, open: st.menu === 'grg', onToggle: this.chartTog('grg'), options: this.opts('grg', ['Holdings', 'Categories'], st.growthGroup, 'growthGroup') }],
      grid: this.grid(grMin, grMax, 3, 138, 10, (v) => F.num(v, 0) + '%'),
      zeroY: grZero.toFixed(1),
      bars: grSorted.map((p, i) => {
        const v = p.dividendGrowth5Y;
        const y = 138 - (v - grMin) / (grMax - grMin) * 128;
        const g = grG[i];
        const top = Math.min(y, grZero), h = Math.abs(grZero - y);
        return Object.assign({
          label: grByCat && p.ticker.length > 14 ? p.ticker.slice(0, 13) + '…' : p.ticker, labelColor: 'var(--t3)',
          parts: [{ x: g.x, y: top.toFixed(1), w: g.w, h: Math.max(1, h).toFixed(1), fill: v >= 0 ? 'var(--accent)' : 'var(--neg)' }],
          marker: false, markerX1: 0, markerX2: 0, markerY: 0,
          sx: g.sx, sw: g.sw
        }, this.hoverOf('gr', i));
      }),
      tip: (() => {
        const i = st.hover && st.hover.id === 'gr' ? st.hover.i : null;
        if (i === null || !grSorted[i]) return null;
        const p = grSorted[i];
        if (grByCat) {
          return {
            title: p.ticker, headline: F.caret(p.dividendGrowth5Y, 1) + ' a year',
            sub: 'value-weighted five-year CAGR',
            rows: p.cat.members.slice().sort((a, b) => b.dividendGrowth5Y - a.dividendGrowth5Y).map((m) => ({
              label: m.ticker, value: F.caret(m.dividendGrowth5Y, 1),
              color: m.dividendGrowth5Y >= 0 ? 'var(--accent)' : 'var(--neg)',
              tone: m.dividendGrowth5Y >= 0 ? 'pos' : 'neg'
            })),
            footer: F.money(p.value) + ' across ' + p.cat.members.length + (p.cat.members.length === 1 ? ' holding' : ' holdings'),
            footerTone: p.dividendGrowth5Y < 0 ? 'neg' : 'pos'
          };
        }
        const h = D.holding(p);
        return {
          title: p.ticker + ' · ' + p.name,
          headline: F.caret(p.dividendGrowth5Y, 1) + ' a year',
          sub: 'five-year dividend CAGR',
          rows: [
            { label: 'Current yield', value: F.pct(p.yieldPct), color: 'var(--accent)' },
            { label: 'Gross income', value: F.money(h.annualGross), color: 'var(--accent-3)' },
            { label: 'Received to date', value: F.money(p.dividendsReceived), color: 'var(--grey-series)' }
          ],
          footer: p.dividendGrowth5Y < 0 ? 'Dividend has been cut over this period' : 'Dividend has grown every year',
          footerTone: p.dividendGrowth5Y < 0 ? 'neg' : 'pos'
        };
      })(),
      tipLeft: st.hover && st.hover.id === 'gr' && grG[st.hover.i] ? this.tipLeft(parseFloat(grG[st.hover.i].cx)) : '50%',
      footer: grByCat
        ? 'Categories are weighted by market value; holdings with less than five years of payments are left out of the average.'
        : payers.length - grWithHistory.length + ' paying holdings have less than five years of history and are not shown.'
    });

    /* ---- 3 · Future payments -------------------------------------------- */
    const fp = D.forwardPayments();
    const fpMax = 200;
    const fpG = this.geom(12, 46, 616, 10, 138, 22);
    charts.push({
      id: 'fp', span: 'span 1', title: 'Future payments',
      subtitle: 'next 12 months · ' + F.money(T.forwardGross),
      legend: [{ label: 'Received', color: 'var(--accent)' }, { label: 'Projected', color: 'var(--accent-3)' }],
      controls: [],
      grid: this.grid(0, fpMax, 4, 138, 10, (v) => '$' + F.num(v, 0)),
      bars: fp.map((mo, i) => {
        const g = fpG[i];
        const h = mo.total / fpMax * 128;
        const rh = mo.received / fpMax * 128;
        return Object.assign({
          label: mo.label, labelColor: i === 0 ? 'var(--t2)' : 'var(--t3)',
          parts: [
            { x: g.x, y: (138 - h).toFixed(1), w: g.w, h: h.toFixed(1), fill: 'var(--accent-3)' },
            { x: g.x, y: (138 - rh).toFixed(1), w: g.w, h: rh.toFixed(1), fill: 'var(--accent)' }
          ],
          marker: false, markerX1: 0, markerX2: 0, markerY: 0,
          sx: g.sx, sw: g.sw
        }, this.hoverOf('fp', i));
      }),
      tip: (() => {
        const i = st.hover && st.hover.id === 'fp' ? st.hover.i : null;
        if (i === null || !fp[i]) return null;
        const mo = fp[i];
        const dot = (s) => s === 'Paid' ? 'var(--accent)' : s === 'Declared' ? 'var(--accent-3)' : 'var(--accent-4)';
        return {
          title: mo.full, headline: F.money(mo.total),
          sub: mo.received > 0 ? F.money(mo.received) + ' received · ' + F.money(mo.total - mo.received) + ' projected' : mo.rows.length + ' payments projected',
          rows: mo.rows.map((r) => ({ label: r.t, value: F.money(r.amt), color: dot(r.status) }))
        };
      })(),
      tipLeft: st.hover && st.hover.id === 'fp' && fpG[st.hover.i] ? this.tipLeft(parseFloat(fpG[st.hover.i].cx)) : '50%',
      footer: ''
    });

    /* ---- 4 · Dividends received, by month ------------------------------- */
    const tl = D.dividendTimeline().slice(-12);
    const rmMax = this.niceMax(Math.max.apply(null, tl.map((x) => x.v)), 4);
    const rmG = this.geom(tl.length, 46, 616, 10, 138, 22);
    charts.push({
      id: 'rm', span: 'span 1', title: 'Dividends received',
      subtitle: 'by month · ' + F.money(tl.reduce((s, x) => s + x.v, 0)) + ' over 12 months',
      legend: [{ label: 'After tax', color: 'var(--accent)' }],
      controls: [],
      grid: this.grid(0, rmMax, 4, 138, 10, (v) => '$' + F.num(v, 0)),
      bars: tl.map((x, i) => {
        const g = rmG[i];
        const h = x.v / rmMax * 128;
        return Object.assign({
          label: x.label, labelColor: 'var(--t3)',
          parts: [{ x: g.x, y: (138 - h).toFixed(1), w: g.w, h: h.toFixed(1), fill: 'var(--accent)' }],
          marker: false, markerX1: 0, markerX2: 0, markerY: 0,
          sx: g.sx, sw: g.sw
        }, this.hoverOf('rm', i));
      }),
      tip: (() => {
        const i = st.hover && st.hover.id === 'rm' ? st.hover.i : null;
        if (i === null || !tl[i]) return null;
        const pt = tl[i];
        const sc = D.scheduleFor(pt.label);
        const raw = sc.reduce((s, r) => s + r.amt, 0) || 1;
        return {
          title: pt.label + ' ' + pt.year, headline: F.money(pt.v), sub: 'after ' + F.pct(K.withholdingTax * 100, 0) + ' withholding tax',
          rows: sc.map((r) => ({ label: r.t, value: F.money(r.amt / raw * pt.v), color: 'var(--accent)' }))
        };
      })(),
      tipLeft: st.hover && st.hover.id === 'rm' && rmG[st.hover.i] ? this.tipLeft(parseFloat(rmG[st.hover.i].cx)) : '50%',
      footer: ''
    });

    /* ---- 5 · Dividends received, by holding ----------------------------- */
    const rhSorted = D.open().filter((p) => p.dividendsReceived > 0).sort((a, b) => b.dividendsReceived - a.dividendsReceived);
    const rhMax = this.niceMax(Math.max.apply(null, rhSorted.map((p) => p.dividendsReceived)), 4);
    const rhG = this.geom(rhSorted.length, 46, 616, 10, 138, 30);
    charts.push({
      id: 'rh', span: 'span 1', title: 'Dividends received',
      subtitle: 'by holding · ' + F.money(T.dividendsReceived) + ' lifetime',
      legend: [{ label: 'After tax', color: 'var(--accent)' }],
      controls: [],
      grid: this.grid(0, rhMax, 4, 138, 10, (v) => '$' + F.num(v, 0)),
      bars: rhSorted.map((p, i) => {
        const g = rhG[i];
        const h = p.dividendsReceived / rhMax * 128;
        return Object.assign({
          label: p.ticker, labelColor: 'var(--t3)',
          parts: [{ x: g.x, y: (138 - h).toFixed(1), w: g.w, h: h.toFixed(1), fill: 'var(--accent)' }],
          marker: false, markerX1: 0, markerX2: 0, markerY: 0,
          sx: g.sx, sw: g.sw
        }, this.hoverOf('rh', i));
      }),
      tip: (() => {
        const i = st.hover && st.hover.id === 'rh' ? st.hover.i : null;
        if (i === null || !rhSorted[i]) return null;
        const p = rhSorted[i], h = D.holding(p);
        return {
          title: p.ticker + ' · ' + p.name, headline: F.money(p.dividendsReceived), sub: 'received to date, after tax',
          rows: [
            { label: 'Per share', value: F.money(h.dividendsPerShare), color: 'var(--accent-3)' },
            { label: 'Forward gross', value: F.money(h.annualGross), color: 'var(--accent)' },
            { label: 'Share of income', value: F.pct(T.forwardGross ? h.annualGross / T.forwardGross * 100 : 0, 1), color: 'var(--grey-series)' }
          ]
        };
      })(),
      tipLeft: st.hover && st.hover.id === 'rh' && rhG[st.hover.i] ? this.tipLeft(parseFloat(rhG[st.hover.i].cx)) : '50%',
      footer: ''
    });

    /* ---- 6 · Dividend growth, grouped by month across years ------------- */
    const years = ['2024', '2025', '2026'];
    const tints = ['var(--accent-4)', 'var(--accent-3)', 'var(--accent)'];
    const dgMax = 175;
    const dgG = this.geom(12, 46, 616, 10, 138, 37);
    charts.push({
      id: 'dg', span: 'span 1', title: 'Dividend growth',
      subtitle: 'same month, year over year',
      legend: years.map((y, j) => ({ label: y, color: tints[j] })),
      controls: [],
      grid: this.grid(0, dgMax, 3, 138, 10, (v) => '$' + F.num(v, 0)),
      bars: D.MONTHS.map((mo, i) => {
        const g = dgG[i];
        const parts = years.map((y, j) => {
          const v = D.dividendHistory[y][i] === undefined ? 0 : D.dividendHistory[y][i];
          const h = v / dgMax * 128;
          return { x: (parseFloat(g.x) + j * 13).toFixed(1), y: (138 - h).toFixed(1), w: 11, h: h.toFixed(1), fill: tints[j] };
        });
        return Object.assign({ label: mo, labelColor: 'var(--t3)', parts: parts, marker: false, markerX1: 0, markerX2: 0, markerY: 0, sx: g.sx, sw: g.sw }, this.hoverOf('dg', i));
      }),
      tip: (() => {
        const i = st.hover && st.hover.id === 'dg' ? st.hover.i : null;
        if (i === null) return null;
        const v26 = D.dividendHistory[2026][i], v25 = D.dividendHistory[2025][i];
        return {
          title: D.MONTHS[i], headline: v26 === undefined ? F.money(v25) + ' in 2025' : F.money(v26),
          rows: years.map((y, j) => ({ label: y, value: D.dividendHistory[y][i] === undefined ? '—' : F.money(D.dividendHistory[y][i]), color: tints[j] })),
          footer: v26 === undefined ? 'No 2026 payment yet' : (v25 > 0 ? F.caret((v26 - v25) / v25 * 100, 1) + ' vs 2025' : 'first year of payments'),
          footerTone: v26 !== undefined && v26 >= v25 ? 'pos' : 'neg'
        };
      })(),
      tipLeft: st.hover && st.hover.id === 'dg' && dgG[st.hover.i] ? this.tipLeft(parseFloat(dgG[st.hover.i].cx)) : '50%',
      footer: ''
    });

    /* ---- dividend rating ------------------------------------------------ */
    const rated = D.open().map((p) => ({ p: p, r: D.dividendRating(p), h: D.holding(p) }));
    const buckets = ['Reliable', 'Safe', 'OK', 'At risk', 'Not available'];
    /* Monochrome ramp only — amber is reserved for the row warning glyph. */
    const bucketColors = {
      Reliable: 'var(--accent)', Safe: 'var(--accent-2)', OK: 'var(--accent-3)',
      'At risk': 'var(--accent-4)', 'Not available': 'var(--grey-series)'
    };
    const groups = buckets.map((b) => {
      const items = rated.filter((x) => x.r.label === b);
      return { name: b, count: items.length, value: items.reduce((s, x) => s + x.p.value, 0), color: bucketColors[b] };
    }).filter((g) => g.count > 0);
    const gTotal = groups.reduce((s, g) => s + g.value, 0);
    const RC = 2 * Math.PI * 76;
    let racc = 0;
    const ratingSegs = groups.map((g) => {
      const len = g.value / gTotal * RC;
      const seg = {
        color: g.color, dash: Math.max(0.6, len - 2.5).toFixed(2) + ' ' + (RC - Math.max(0.6, len - 2.5)).toFixed(2),
        offset: (-racc).toFixed(2), sw: st.ratingHover === g.name ? 24 : 20,
        op: st.ratingHover === null || st.ratingHover === g.name ? 1 : 0.3,
        onEnter: () => this.setState({ ratingHover: g.name }),
        onLeave: () => this.setState({ ratingHover: null })
      };
      racc += len;
      return seg;
    });
    const hovG = groups.filter((g) => g.name === st.ratingHover)[0];
    const scoreColor = (s) => s === null ? 'var(--t3)' : s >= 75 ? 'var(--accent)' : s >= 60 ? 'var(--t1)' : s >= 40 ? 'var(--t2)' : 'var(--tag-fg)';

    const income = D.incomeBreakdown();

    return Object.assign(base, {
      portfolioName: K.portfolioName,
      headPayers: payers.length + ' of ' + T.holdings + ' holdings pay a dividend',
      headTax: F.pct(K.withholdingTax * 100, 0) + ' withholding',
      headNext: 'Next ex-date ' + (payers.slice().sort((a, b) => (a.nextExDate || '').localeCompare(b.nextExDate || ''))[0].nextExDate || '—'),

      yieldPrimary: F.pct(T.grossYield), yieldSecondary: F.pct(T.netYield),
      yieldOnCost: F.pct(T.yieldOnCost) + ' yield on cost',
      yieldSpread: F.num(T.yieldOnCost - T.grossYield, 2) + 'pp above current yield',
      divPrimary: F.money(T.forwardGross), divDelta: F.caret(K.incomeGrowthYoY, 1),
      divSecondary: F.money(T.forwardGross / 12),
      divNet: F.money(T.forwardNet) + ' after tax',
      divCount: D.paymentCountNext12() + ' payments a year',

      charts: charts,

      incomeSubtitle: income.length + ' payers · ' + F.money(T.forwardGross) + ' a year',
      incomeRows: income.map((r) => ({ name: r.name, subLabel: r.subLabel, value: r.value })),
      incomeFooter: 'Top two holdings produce ' + F.pct(income.slice(0, 2).reduce((s, r) => s + r.pct, 0), 1) + ' of forward income — both are covered-call products.',

      ratingSubtitle: rated.length + ' holdings · weighted by market value',
      ratingSegs: ratingSegs,
      ratingCenterValue: hovG ? F.pct(hovG.value / gTotal * 100, 1) : F.pct(groups.filter((g) => g.name === 'Reliable' || g.name === 'Safe').reduce((s, g) => s + g.value, 0) / gTotal * 100, 1),
      ratingCenterLabel: hovG ? hovG.name + ' · ' + hovG.count + ' holdings' : 'Reliable or Safe',
      ratingLegend: groups.map((g) => ({
        label: g.name, count: g.count + (g.count === 1 ? ' holding' : ' holdings'),
        pct: F.pct(g.value / gTotal * 100, 1), color: g.color,
        bg: st.ratingHover === g.name ? 'var(--hover)' : 'transparent',
        onEnter: () => this.setState({ ratingHover: g.name }),
        onLeave: () => this.setState({ ratingHover: null })
      })),
      ratingRows: rated.slice().sort((a, b) => (b.r.score === null ? -1 : b.r.score) - (a.r.score === null ? -1 : a.r.score)).map((x) => ({
        ticker: x.p.ticker, name: x.p.name, mono: x.p.mono,
        value: F.money(x.p.value), invested: F.money(x.p.costTotal) + ' invested',
        annual: x.h.annualGross ? F.money(x.h.annualGross) : '—',
        annualNet: x.h.annualGross ? F.money(x.h.annualNet) + ' net' : 'no dividend',
        score: x.r.score === null ? '—' : String(x.r.score),
        scoreColor: scoreColor(x.r.score),
        label: x.r.label, warn: x.r.warn,
        warnText: x.r.reasons.join(' · ')
      }))
    });
  }
}
