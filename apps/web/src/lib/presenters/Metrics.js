// @ts-nocheck
/** Presentation and chart geometry from Metrics.dc.html; data comes from the core engine. */
import { Presenter } from "./presenter.svelte";
export default class MetricsPresenter extends Presenter {
  state = { tip: null, menu: null, refMarkers: null, tags: null };

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

  ticksFor(min, max, step) {
    const out = [];
    for (let v = min; v <= max + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
    return out;
  }

  renderVals() {
    const st = this.state;
    const I = {
      bars: 'M4 20V10M10 20V4M16 20v-7M22 20H2', table: 'M3 5h18v14H3V5Zm0 5h18M9 10v9',
      home: 'M4 11l8-7 8 7v9H4v-9Zm5 9v-6h6v6',
      scale: 'M12 4v16M6 8l-3 6h6l-3-6Zm12 0l-3 6h6l-3-6ZM5 8h14', dots: 'M5 12h.01M12 12h.01M19 12h.01'
    };
    const base = {
      tabRows: [
        { label: 'Dashboard', d: I.home, href: '/', color: 'var(--t3)' },
        { label: 'Analytics', d: I.bars, href: '/analytics', color: 'var(--accent)' },
        { label: 'Portfolio', d: I.table, href: '/portfolio/holdings', color: 'var(--t3)' },
        { label: 'Tools', d: I.scale, href: '/tools/rebalancing', color: 'var(--t3)' }
      ]
    };
    if (!this.data) return base;

    const D = this.data, F = D.fmt, K = D.constants, T = D.totals();
    const H = D.history();
    const R = D.riskStats();
    /* the on-screen Display menu wins once touched; props seed the default */
    const showRef = st.refMarkers === null ? this.getProps().benchmarkMarkers !== false : st.refMarkers;
    const showTags = st.tags === null ? this.getProps().verdictTags !== false : st.tags;
    const ref = (m) => showRef ? [m] : [];
    const P = R.portfolio, B = R.benchmark;
    const L = R.lifetime;

    /* ---- lifetime TWR chart (always the full history) -------------------- */
    const cum = H.map((m) => ({ p: (m.twrIndex - 1) * 100, b: (m.benchmarkIndex - 1) * 100, short: m.short }));
    const chartMax = this.niceMax(Math.max.apply(null, cum.map((c) => Math.max(c.p, c.b))), 4);
    const cx = (i) => cum.length < 2 ? 0 : i / (cum.length - 1) * 1000;
    const cy = (v) => 160 - v / chartMax * 150;
    const line = (key) => cum.map((c, i) => (i ? 'L' : 'M') + cx(i).toFixed(1) + ' ' + cy(c[key]).toFixed(1)).join(' ');

    /* ---- gauge cards ----------------------------------------------------- */
    const tip = (id) => ({
      tipOn: () => this.setState({ tip: id }),
      tipOff: () => this.setState({ tip: null }),
      showTip: st.tip === id
    });
    const vBeta = D.riskVerdict('beta', P.beta);
    const vSharpe = D.riskVerdict('sharpe', P.sharpe);
    const vSortino = D.riskVerdict('sortino', P.sortino);
    const rf = F.pct(R.riskFree, 2);
    const windowSpan = R.months + ' months to ' + R.toShort;

    const cards = [
      Object.assign({
        title: 'Portfolio P/E',
        explain: 'Weighted average P/E of all individual stocks combined.',
        tip: 'Each stock is weighted by its market value. Funds are excluded — an ETF or ETN has no single earnings figure — so this covers ' + F.money(R.stocks.value) + ' of the portfolio, not all of it.',
        min: 0, max: 70, ticks: this.ticksFor(0, 70, 10),
        minLabel: '0x cheap', maxLabel: '70x expensive',
        markers: [{ value: R.pe, label: 'Portfolio', display: F.num(R.pe, 1) + 'x' }],
        statement: 'Weighted across ' + R.stocks.count + ' stock positions (P/E = ' + F.num(R.pe, 1) + 'x)',
        verdict: '', verdictTone: 'neutral',
        note: R.stocks.tickers.join(' · ') + ' — ' + F.money(R.stocks.value) + ', ' + F.pct(R.stocks.shareOfPortfolio, 1) + ' of the portfolio.'
      }, tip('pe')),

      Object.assign({
        title: 'Volatility',
        explain: 'Portfolio volatility relative to the market.',
        tip: 'Beta is measured from ' + R.months + ' monthly returns against ' + B.label + '. A beta of 1.00 moves with the market; below 1.00 moves less, in both directions.',
        min: 0, max: 2, ticks: this.ticksFor(0, 2, 0.25),
        minLabel: '0.00 no market risk', maxLabel: '2.00 twice the market',
        markers: [{ value: P.beta, label: 'Portfolio', display: F.num(P.beta, 3) }].concat(
          ref({ value: R.marketBeta, label: 'Market', display: F.num(R.marketBeta, 3), primary: false, shape: 'square' })),
        statement: 'Volatility of your portfolio (β = ' + F.num(P.beta, 3) + ')',
        verdict: showTags ? vBeta.label : '', verdictTone: vBeta.tone,
        note: 'Annualised volatility ' + F.pct(P.volatility, 2) + ' against ' + B.label + ' at ' + F.pct(B.volatility, 2) + ' over the same ' + R.months + ' months.'
      }, tip('beta')),

      Object.assign({
        title: 'Risk-adjusted return · Sharpe ratio',
        explain: 'How well profitability compensates for risk.',
        tip: 'Return above the risk-free rate divided by total volatility, annualised. Above 1.00 is generally considered adequate. The risk-free rate here is your own T-bill holding, ' + R.riskFreeSource + ' at ' + rf + '.',
        min: 0, max: 3, ticks: this.ticksFor(0, 3, 0.5),
        minLabel: '0.00 no premium', maxLabel: '3.00 exceptional',
        markers: [{ value: P.sharpe, label: 'Portfolio', display: F.num(P.sharpe, 3) }].concat(
          ref({ value: B.sharpe, label: B.label, display: F.num(B.sharpe, 3), primary: false, shape: 'square' })),
        statement: 'Risk-adjusted return of your portfolio (Sharpe = ' + F.num(P.sharpe, 3) + ')',
        verdict: showTags ? vSharpe.label : '', verdictTone: vSharpe.tone,
        note: 'Excess return over ' + rf + ' per unit of total volatility, ' + windowSpan + '.'
      }, tip('sharpe')),

      Object.assign({
        title: 'Risk-adjusted return · Sortino ratio',
        explain: 'Same, but only negative returns are considered.',
        tip: 'Return above the risk-free rate divided by downside deviation, so months that gained do not count as risk. A value above two is considered good.',
        min: 0, max: 4, ticks: this.ticksFor(0, 4, 0.5),
        minLabel: '0.00 no premium', maxLabel: '4.00 exceptional',
        markers: [{ value: P.sortino, label: 'Portfolio', display: F.num(P.sortino, 3) }].concat(
          ref({ value: B.sortino, label: B.label, display: F.num(B.sortino, 3), primary: false, shape: 'square' })),
        statement: 'Risk-adjusted return of your portfolio (Sortino = ' + F.num(P.sortino, 3) + ')',
        verdict: showTags ? vSortino.label : '', verdictTone: vSortino.tone,
        note: 'A value above two is considered good. Only the ' + P.downMonths + ' months that lost money count as risk.'
      }, tip('sortino'))
    ];

    return Object.assign(base, {
      portfolioName: K.portfolioName,
      headPositions: T.holdings + ' positions · ' + F.money(T.value),
      headTwr: 'TWR ' + F.caret(L.twr, 2) + ' vs ' + B.label + ' ' + F.caret(L.benchmarkTwr, 2),

      twrTip: 'Time-weighted return chain-links each month\'s return, so deposits and withdrawals neither flatter nor penalise the figure. Compare it with a benchmark; compare IRR (' + F.pct(L.irr, 2) + ') with your own contributions.',
      twrValue: F.pct(L.twr, 2),
      twrSpan: H[0].key + ' – ' + H[H.length - 1].key + ' · ' + H.length + ' months',
      benchLabel: B.label,
      benchValue: F.pct(L.benchmarkTwr, 2),
      benchGap: F.caret(L.gap, 2),
      twrNote: B.label + ' is ' + F.num(L.gap, 2) + ' percentage points ahead over the same period. IRR, which does count the timing of your deposits, is ' + F.pct(L.irr, 2) + '.',
      twrLegend: [
        { label: 'Portfolio', color: 'var(--accent)', value: F.pct(L.twr, 2) },
        { label: B.label, color: 'var(--grey-series)', value: F.pct(L.benchmarkTwr, 2) }
      ],
      twrGrid: [0, 1, 2, 3, 4].map((i) => {
        const v = chartMax / 4 * i, y = cy(v);
        return { y: y.toFixed(1), top: (y / 170 * 100).toFixed(2) + '%', label: F.num(v, 0) + '%' };
      }),
      twrLine: line('p'),
      twrBench: line('b'),
      twrXLabels: cum.filter((c, i) => i % Math.max(1, Math.ceil(cum.length / 6)) === 0 || i === cum.length - 1).map((c) => ({ label: c.short })),

      windowNote: R.from + ' – ' + R.to + ' · ' + R.months + ' monthly returns',
      riskFreeNote: 'Risk-free rate ' + rf + ' · ' + R.riskFreeSource,
      benchSourceNote: 'Benchmark ' + B.label + ' · ' + F.pct(B.volatility, 2) + ' volatility',

      stop: (e) => e.stopPropagation(),
      togDisplay: (e) => { e.stopPropagation(); this.setState({ menu: st.menu === 'display' ? null : 'display' }); },
      mDisplay: st.menu === 'display',
      displayBg: st.menu === 'display' ? 'var(--hover)' : 'var(--card)',
      displayFg: st.menu === 'display' ? 'var(--t1)' : 'var(--t2)',
      displayRows: [
        {
          label: 'Reference markers', on: showRef,
          hint: 'Show ' + B.label + ' and the market on each number line.',
          onClick: (e) => { e.stopPropagation(); this.setState({ refMarkers: !showRef }); }
        },
        {
          label: 'Verdict tags', on: showTags,
          hint: 'Show the plain-language rating chip beside each statement.',
          onClick: (e) => { e.stopPropagation(); this.setState({ tags: !showTags }); }
        }
      ].map((r) => Object.assign(r, {
        boxBg: r.on ? 'var(--accent)' : 'transparent',
        boxBorder: r.on ? 'var(--accent)' : 'var(--line)',
        tick: r.on ? 'var(--on-accent)' : 'transparent'
      })),
      gaugeCards: cards
    });
  }
}
