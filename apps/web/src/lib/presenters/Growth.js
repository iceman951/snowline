// @ts-nocheck
/** Presentation and chart geometry from Growth.dc.html; data comes from the core engine. */
import { Presenter } from "./presenter.svelte";
export default class GrowthPresenter extends Presenter {
  state = {
    menu: null, benchmarks: ['SPY'],
    pvRange: 'all', ppRange: 'all', hpRange: 'all',
    dynPeriod: 'all', hpView: 'chart',
    pvHover: null, ppHover: null, hpHover: null
  };

  componentDidMount() {
    this.doc = () => { if (this.state.menu) this.setState({ menu: null }); };
    document.addEventListener('click', this.doc);

  }
  componentWillUnmount() { if (this.doc) document.removeEventListener('click', this.doc); }

  niceMax(raw, steps) {
    if (!(raw > 0)) return steps;
    const mag = Math.pow(10, Math.floor(Math.log10(raw / steps)));
    const cands = [1, 2, 2.5, 5, 10, 20, 25];
    for (let m = mag; m <= mag * 10000; m *= 10) {
      for (let i = 0; i < cands.length; i++) {
        const step = cands[i] * m;
        if (step * steps >= raw) return step * steps;
      }
    }
    return Math.ceil(raw / steps) * steps;
  }

  /* index under the pointer, from a mousemove on a stretched viewBox svg */
  indexAt(e, count) {
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width) return 0;
    const t = (e.clientX - r.left) / r.width;
    return Math.max(0, Math.min(count - 1, Math.round(t * (count - 1))));
  }

  renderVals() {
    const st = this.state;
    const I = {
      bars: 'M4 20V10M10 20V4M16 20v-7M22 20H2', table: 'M3 5h18v14H3V5Zm0 5h18M9 10v9',
      home: 'M4 11l8-7 8 7v9H4v-9Zm5 9v-6h6v6',
      scale: 'M12 4v16M6 8l-3 6h6l-3-6Zm12 0l-3 6h6l-3-6ZM5 8h14', dots: 'M5 12h.01M12 12h.01M19 12h.01',
      chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2'
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
    const full = D.history();

    /* ---- benchmarks ------------------------------------------------------ */
    const BENCH = [
      { t: 'SPY', n: 'S&P 500 ETF', r: K.benchmarkTwr },
      { t: 'QQQ', n: 'Nasdaq 100 ETF', r: 112.4 },
      { t: 'SCHD', n: 'US Dividend Equity', r: 41.6 },
      { t: 'VT', n: 'Total World Stock', r: 63.9 },
      { t: 'AGG', n: 'US Aggregate Bond', r: 9.2 }
    ];
    const toggleBench = (t) => (e) => {
      e.stopPropagation();
      this.setState((s) => ({
        benchmarks: s.benchmarks.indexOf(t) >= 0 ? s.benchmarks.filter((x) => x !== t) : s.benchmarks.concat([t]),
        menu: null
      }));
    };

    /* ---- 1 · Portfolio value -------------------------------------------- */
    const pv = D.historyRange(st.pvRange === 'custom' ? 'all' : st.pvRange);
    const pvMax = this.niceMax(Math.max.apply(null, pv.map((m) => Math.max(m.value, m.invested))), 4);
    const px = (i) => pv.length < 2 ? 0 : i / (pv.length - 1) * 1000;
    const py = (v) => 250 - v / pvMax * 240;
    const pvLine = pv.map((m, i) => (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(m.value).toFixed(1)).join(' ');
    const pvHoverIdx = st.pvHover;
    const pvFirst = pv[0], pvLast = pv[pv.length - 1];
    const pvDelta = pvLast.value - pvFirst.value;

    /* ---- 2 · Portfolio performance -------------------------------------- */
    const pp = D.historyRange(st.ppRange === 'custom' ? 'all' : st.ppRange);
    const ppVals = pp.map((m) => m.totalProfit);
    const ppMin = Math.min(0, Math.min.apply(null, ppVals));
    const ppMax = this.niceMax(Math.max.apply(null, ppVals), 4);
    const ppx = (i) => pp.length < 2 ? 0 : i / (pp.length - 1) * 1000;
    const ppy = (v) => 205 - (v - ppMin) / (ppMax - ppMin) * 195;
    const ppLine = pp.map((m, i) => (i ? 'L' : 'M') + ppx(i).toFixed(1) + ' ' + ppy(m.totalProfit).toFixed(1)).join(' ');

    /* ---- 3 · Dynamics of returns ---------------------------------------- */
    const dyn = D.monthlyReturns(st.dynPeriod);
    const dynAbs = Math.max.apply(null, dyn.map((m) => Math.abs(m.pct)));
    const dynBound = this.niceMax(dynAbs, 2);
    const dynSlot = 950 / dyn.length;
    const dyny = (v) => 118 - v / dynBound * 100;

    /* ---- 4 · Holdings performance --------------------------------------- */
    const perf = D.holdingsPerformance();
    const hpAbs = Math.max.apply(null, perf.map((p) => Math.abs(p.totalProfitPct)));
    const hpBound = this.niceMax(hpAbs, 2);
    const zeroPct = hpBound / (hpBound * 2) * 100;

    return Object.assign(base, {
      portfolioName: K.portfolioName,
      headSpan: full[0].key + ' – ' + full[full.length - 1].key + ' · ' + full.length + ' months',
      headTwr: 'TWR ' + F.caret(K.twr, 2) + ' vs ' + K.benchmark + ' ' + F.caret(K.benchmarkTwr, 2),

      benchChips: st.benchmarks.map((t, i) => {
        const b = BENCH.filter((x) => x.t === t)[0] || { t: t, r: 0 };
        return {
          label: b.t + ' ' + F.caret(b.r, 2), dot: i === 0 ? 'var(--grey-series)' : 'var(--accent-3)',
          bg: 'var(--hover)', border: 'var(--line)', color: 'var(--t1)', onClick: toggleBench(t)
        };
      }),
      togBench: (e) => { e.stopPropagation(); this.setState((s) => ({ menu: s.menu === 'bench' ? null : 'bench' })); },
      mBench: st.menu === 'bench',
      benchOptions: BENCH.map((b) => ({
        label: b.t, note: b.n + ' · ' + F.caret(b.r, 2),
        check: st.benchmarks.indexOf(b.t) >= 0 ? 1 : 0, onClick: toggleBench(b.t)
      })),

      pvRange: st.pvRange,
      setPvRange: (v) => this.setState({ pvRange: v, pvHover: null }),
      pvSpan: pvFirst.key + ' – ' + pvLast.key,
      pvChange: F.signed(pvDelta) + '  ' + F.caret(pvFirst.value ? pvDelta / pvFirst.value * 100 : 0, 2),
      pvChangeColor: pvDelta >= 0 ? 'var(--accent)' : 'var(--neg)',
      pvLegend: [
        { label: 'Portfolio', color: 'var(--accent)', value: F.money(pvLast.value) },
        { label: 'Invested', color: 'var(--grey-series)', value: F.money(pvLast.invested) }
      ],
      pvGrid: [0, 1, 2, 3, 4].map((i) => {
        const v = pvMax / 4 * i, y = py(v);
        return { y: y.toFixed(1), top: (y / 260 * 100).toFixed(2) + '%', label: v >= 1000 ? '$' + F.num(v / 1000, 0) + 'k' : '$' + F.num(v, 0) };
      }),
      pvLine: pvLine,
      pvArea: pvLine + ' L1000 250 L0 250 Z',
      pvInvested: pv.map((m, i) => (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(m.invested).toFixed(1)).join(' '),
      pvXLabels: pv.filter((m, i) => i % Math.max(1, Math.ceil(pv.length / 6)) === 0 || i === pv.length - 1).map((m) => ({ label: m.short })),
      pvMove: (e) => { const i = this.indexAt(e, pv.length); if (i !== st.pvHover) this.setState({ pvHover: i }); },
      pvLeave: () => this.setState({ pvHover: null }),
      pvHover: pvHoverIdx !== null,
      pvCursorX: pvHoverIdx === null ? 0 : px(pvHoverIdx).toFixed(1),
      pvDotLeft: pvHoverIdx === null ? '0%' : (px(pvHoverIdx) / 10).toFixed(2) + '%',
      pvDotTop: pvHoverIdx === null ? '0%' : (py(pv[pvHoverIdx].value) / 260 * 100).toFixed(2) + '%',
      pvInvTop: pvHoverIdx === null ? '0%' : (py(pv[pvHoverIdx].invested) / 260 * 100).toFixed(2) + '%',
      pvTipLeft: pvHoverIdx === null ? '50%' : Math.min(86, Math.max(14, px(pvHoverIdx) / 10)) + '%',
      pvTip: pvHoverIdx === null ? null : (() => {
        const m = pv[pvHoverIdx];
        return {
          title: m.key, headline: F.money(m.value),
          rows: [
            { label: 'Portfolio', value: F.money(m.value), color: 'var(--accent)' },
            { label: 'Invested', value: F.money(m.invested), color: 'var(--grey-series)' },
            { label: 'Unrealised gain', value: F.signed(m.value - m.invested), color: 'var(--accent-3)', tone: m.value >= m.invested ? 'pos' : 'neg' }
          ],
          footer: F.caret(m.monthReturn, 2) + ' this month',
          footerTone: m.monthReturn >= 0 ? 'pos' : 'neg'
        };
      })(),

      ppRange: st.ppRange,
      setPpRange: (v) => this.setState({ ppRange: v, ppHover: null }),
      ppSpan: pp[0].key + ' – ' + pp[pp.length - 1].key,
      ppChange: F.signed(pp[pp.length - 1].totalProfit) + '  ' + F.caret(T.totalProfitPct, 2),
      ppChangeColor: pp[pp.length - 1].totalProfit >= 0 ? 'var(--accent)' : 'var(--neg)',
      ppGrid: [0, 1, 2, 3, 4].map((i) => {
        const v = ppMin + (ppMax - ppMin) / 4 * i, y = ppy(v);
        return { y: y.toFixed(1), top: (y / 220 * 100).toFixed(2) + '%', label: (v < 0 ? '-$' : '$') + F.num(Math.abs(v) / 1000, 1) + 'k' };
      }),
      ppZeroY: ppy(0).toFixed(1),
      ppLine: ppLine,
      ppArea: ppLine + ' L1000 ' + ppy(0).toFixed(1) + ' L0 ' + ppy(0).toFixed(1) + ' Z',
      ppXLabels: pp.filter((m, i) => i % Math.max(1, Math.ceil(pp.length / 6)) === 0 || i === pp.length - 1).map((m) => ({ label: m.short })),
      ppMove: (e) => { const i = this.indexAt(e, pp.length); if (i !== st.ppHover) this.setState({ ppHover: i }); },
      ppLeave: () => this.setState({ ppHover: null }),
      ppHover: st.ppHover !== null,
      ppCursorX: st.ppHover === null ? 0 : ppx(st.ppHover).toFixed(1),
      ppDotLeft: st.ppHover === null ? '0%' : (ppx(st.ppHover) / 10).toFixed(2) + '%',
      ppDotTop: st.ppHover === null ? '0%' : (ppy(pp[st.ppHover].totalProfit) / 220 * 100).toFixed(2) + '%',
      ppTipLeft: st.ppHover === null ? '50%' : Math.min(86, Math.max(14, ppx(st.ppHover) / 10)) + '%',
      ppTip: st.ppHover === null ? null : (() => {
        const m = pp[st.ppHover];
        return {
          title: m.key, headline: F.signed(m.totalProfit), sub: 'cumulative profit',
          rows: [
            { label: 'Capital gain', value: F.signed(m.capitalGain), color: 'var(--accent)', tone: m.capitalGain >= 0 ? 'pos' : 'neg' },
            { label: 'Dividends to date', value: F.money(m.totalProfit - m.capitalGain - m.realizedToDate), color: 'var(--accent-3)' },
            { label: 'Realised P&L', value: F.signed(m.realizedToDate), color: 'var(--grey-series)' }
          ]
        };
      })(),

      dynSubtitle: dyn.length + ' months · monthly return',
      dynPills: ['all', '12m', '2026', '2025', '2024'].map((p) => ({
        label: p, bg: st.dynPeriod === p ? 'var(--accent-soft)' : 'transparent',
        color: st.dynPeriod === p ? 'var(--accent)' : 'var(--t2)',
        weight: st.dynPeriod === p ? 600 : 500,
        onClick: () => this.setState({ dynPeriod: p })
      })),
      dynGrid: [-1, -0.5, 0, 0.5, 1].map((f) => {
        const v = dynBound * f, y = dyny(v);
        return { y: y.toFixed(1), top: (y / 230 * 100).toFixed(2) + '%', label: F.num(v, 0) + '%' };
      }),
      dynZeroY: dyny(0).toFixed(1),
      dynBars: dyn.map((m, i) => {
        const y = dyny(m.pct), z = dyny(0);
        const bw = Math.min(34, dynSlot * 0.58);
        const cx = 44 + i * dynSlot + dynSlot / 2;
        return {
          label: dyn.length > 14 ? (i % 2 ? '' : m.label) : m.label,
          pct: F.caret(m.pct, 1),
          x: (cx - bw / 2).toFixed(1), w: bw.toFixed(1),
          y: Math.min(y, z).toFixed(1), h: Math.max(1, Math.abs(z - y)).toFixed(1),
          fill: m.pct >= 0 ? 'var(--accent)' : 'var(--neg)',
          labelLeft: (cx / 1000 * 100).toFixed(2) + '%',
          labelTop: ((m.pct >= 0 ? y - 10 : y + 10) / 230 * 100).toFixed(2) + '%',
          labelColor: m.pct >= 0 ? 'var(--accent)' : 'var(--neg)'
        };
      }),

      hpRange: st.hpRange,
      setHpRange: (v) => this.setState({ hpRange: v }),
      hpSubtitle: perf.length + ' holdings · total profit including dividends',
      hpViews: [
        { title: 'Chart', d: I.chart, bg: st.hpView === 'chart' ? 'var(--accent-soft)' : 'transparent', color: st.hpView === 'chart' ? 'var(--accent)' : 'var(--t2)', onClick: () => this.setState({ hpView: 'chart' }) },
        { title: 'Table', d: I.table, bg: st.hpView === 'table' ? 'var(--accent-soft)' : 'transparent', color: st.hpView === 'table' ? 'var(--accent)' : 'var(--t2)', onClick: () => this.setState({ hpView: 'table' }) }
      ],
      hpIsChart: st.hpView === 'chart',
      hpIsTable: st.hpView === 'table',
      hpRows: perf.map((p) => {
        const w = Math.abs(p.totalProfitPct) / (hpBound * 2) * 100;
        const pos = p.totalProfitPct >= 0;
        return {
          ticker: p.ticker,
          zero: zeroPct + '%',
          barLeft: (pos ? zeroPct : zeroPct - w).toFixed(2) + '%',
          barWidth: w.toFixed(2) + '%',
          fill: pos ? 'var(--accent)' : 'var(--neg)',
          labelLeft: (pos ? zeroPct + w : zeroPct - w).toFixed(2) + '%',
          labelColor: pos ? 'var(--accent)' : 'var(--neg)',
          pct: F.caret(p.totalProfitPct, 2),
          bg: st.hpHover === p.ticker ? 'var(--hover)' : 'transparent',
          onEnter: () => this.setState({ hpHover: p.ticker }),
          onLeave: () => this.setState({ hpHover: null }),
          tipLeft: (pos ? Math.min(62, zeroPct + w) : Math.max(6, zeroPct - w - 10)).toFixed(2) + '%',
          tip: st.hpHover === p.ticker ? {
            title: p.ticker + ' · ' + p.name,
            headline: F.caret(p.totalProfitPct, 2),
            sub: F.signed(p.totalProfit) + ' total profit',
            rows: [
              { label: 'Capital gain', value: F.signed(p.capitalGain), color: 'var(--accent)', tone: p.capitalGain >= 0 ? 'pos' : 'neg' },
              { label: 'Dividends received', value: F.money(p.dividends), color: 'var(--accent-3)' },
              { label: 'Taxes withheld', value: '-' + F.money(p.taxes), color: 'var(--grey-series)' },
              { label: 'Fees paid', value: '-' + F.money(p.fees), color: 'var(--grey-series)' }
            ],
            footer: F.money(p.value) + ' on ' + F.money(p.invested) + ' invested'
          } : null
        };
      }),
      hpTableRows: perf.map((p) => ({
        ticker: p.ticker, name: p.name, mono: p.mono,
        profit: F.signed(p.totalProfit), profitPct: F.caret(p.totalProfitPct, 2),
        tone: p.totalProfit >= 0 ? 'pos' : 'neg',
        gain: F.signed(p.capitalGain), gainPct: F.caret(p.capitalGainPct, 2),
        gainTone: p.capitalGain >= 0 ? 'pos' : 'neg',
        dividends: p.dividends ? F.money(p.dividends) : '—',
        taxes: p.taxes ? '-' + F.money(p.taxes) : '—',
        fees: '-' + F.money(p.fees)
      }))
    });
  }
}
