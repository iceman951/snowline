// @ts-nocheck
/** Presentation and chart geometry from PortfolioLab.dc.html; data comes from the core engine. */
import { Presenter } from "./presenter.svelte";
export default class PortfolioLabPresenter extends Presenter {
  state = {
    scen: null, active: 0, drafts: {}, amountDraft: null, monthlyDraft: null,
    nameDraft: null, query: '', menu: null, hover: null, titleTip: false
  };

  componentDidMount() {

    this.doc = () => { if (this.state.menu) this.setState({ menu: null }); };
    document.addEventListener('click', this.doc);
  }
  componentWillUnmount() { if (this.doc) document.removeEventListener('click', this.doc); }

  num(v) { const n = parseFloat(String(v === null || v === undefined ? '' : v).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; }

  seed(D) {
    const span = D.monthSpan();
    return [{
      name: 'My portfolio',
      weights: D.labMyPortfolio(),
      amount: Math.round(D.totals().invested),
      monthly: this.getProps().monthlyContribution === undefined ? 300 : this.getProps().monthlyContribution,
      reinvest: this.getProps().reinvest !== false,
      from: 0, to: span.length - 1
    }];
  }

  scenarios(D) {
    if (this.state.scen) return this.state.scen;
    const saved = D.labScenarios();
    if (saved && saved.length) return saved;
    return this.seed(D);
  }

  /* every mutation writes the whole list, so state and storage never diverge */
  commit(list, extra) {
    this.data.saveLabScenarios(list);
    this.setState(Object.assign({ scen: list }, extra || {}));
  }
  patch(D, changes, extra) {
    const list = this.scenarios(D).map((s, i) => (i === this.activeIndex(D) ? Object.assign({}, s, changes) : s));
    this.commit(list, extra);
  }
  activeIndex(D) { return Math.max(0, Math.min(this.scenarios(D).length - 1, this.state.active)); }

  niceMax(raw, steps) {
    if (!(raw > 0)) return steps;
    const mag = Math.pow(10, Math.floor(Math.log10(raw / steps)));
    const cands = [1, 2, 2.5, 5, 10, 20, 25];
    for (let m = mag; m <= mag * 100000; m *= 10) {
      for (let i = 0; i < cands.length; i++) {
        const step = cands[i] * m;
        if (step * steps >= raw) return step * steps;
      }
    }
    return Math.ceil(raw / steps) * steps;
  }

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
      scale: 'M12 4v16M6 8l-3 6h6l-3-6Zm12 0l-3 6h6l-3-6ZM5 8h14', dots: 'M5 12h.01M12 12h.01M19 12h.01'
    };
    const base = {
      stop: (e) => e.stopPropagation(),
      tabRows: [
        { label: 'Dashboard', d: I.home, href: '/', color: 'var(--t3)' },
        { label: 'Analytics', d: I.bars, href: '/analytics', color: 'var(--t3)' },
        { label: 'Portfolio', d: I.table, href: '/portfolio/holdings', color: 'var(--t3)' },
        { label: 'Tools', d: I.scale, href: '/tools/rebalancing', color: 'var(--accent)' }
      ],
      cmpCols: 'minmax(190px,1fr) repeat(2,minmax(130px,0.8fr))',
      legCols: 'minmax(180px,1.15fr) minmax(104px,0.7fr) minmax(170px,1.05fr) minmax(126px,0.85fr) minmax(120px,0.8fr)'
    };
    if (!this.data) return base;

    const D = this.data, F = D.fmt, K = D.constants, T = D.totals();
    const money = (v) => F.money(v);
    const span = D.monthSpan();
    const list = this.scenarios(D);
    const ai = this.activeIndex(D);
    const s = list[ai];
    const wsum = Math.round(s.weights.reduce((a, w) => a + this.num(w.weight), 0) * 100) / 100;
    const sumOff = Math.abs(wsum - 100) > 0.005;

    const cfgOf = (x) => ({
      weights: x.weights, amount: x.amount, monthly: x.monthly,
      reinvest: x.reinvest !== false, from: x.from, to: x.to
    });
    const runs = list.map((x) => D.backtest(cfgOf(x)));
    const run = runs[ai];
    const sec = D.labSecurities();
    const byT = {};
    sec.forEach((r) => { byT[r.ticker] = r; });

    /* ---- scenario chrome ------------------------------------------------- */
    const LETTERS = ['A', 'B', 'C'];
    const tabs = list.map((x, i) => {
      const r = runs[i];
      return {
        badge: LETTERS[i] || String(i + 1), name: x.name || 'Scenario ' + (i + 1),
        meta: r ? F.caret(r.stats.cagr, 1) + ' a year · ' + x.weights.length + (x.weights.length === 1 ? ' name' : ' names')
          : x.weights.length + ' names · nothing to run',
        bg: i === ai ? 'var(--accent-soft)' : 'transparent',
        border: i === ai ? 'var(--accent)' : 'var(--line)',
        color: i === ai ? 'var(--accent)' : 'var(--t1)',
        badgeBg: i === ai ? 'var(--accent)' : 'var(--hover)',
        badgeFg: i === ai ? 'var(--on-accent)' : 'var(--t2)',
        weight: i === ai ? 600 : 500,
        onClick: () => this.setState({ active: i, drafts: {}, amountDraft: null, monthlyDraft: null, nameDraft: null, hover: null })
      };
    });

    /* ---- the run ---------------------------------------------------------- */
    const pts = run ? run.months : [];
    const growth = this.getProps().chartScale === 'Growth of $1';
    const vals = growth
      ? pts.map((p) => ({ me: p.twrIndex * 100, bench: p.benchmarkIndex * 100, invested: 100 }))
      : pts.map((p) => ({ me: p.value, bench: p.benchmark, invested: p.invested }));
    const showBench = this.getProps().showBenchmark !== false;
    const showInvested = !growth;
    const all = [];
    vals.forEach((v) => { all.push(v.me); if (showBench) all.push(v.bench); if (showInvested) all.push(v.invested); });
    const hi = this.niceMax(all.length ? Math.max.apply(null, all) : 1, 4);
    const lowest = all.length ? Math.min.apply(null, all) : 0;
    const lo = growth ? Math.max(0, Math.floor((lowest - 6) / 10) * 10) : 0;
    const x = (i) => (pts.length < 2 ? 0 : i / (pts.length - 1) * 1000);
    const y = (v) => 250 - (hi - lo ? (v - lo) / (hi - lo) : 0) * 240;
    const pathOf = (pick) => vals.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(pick(v)).toFixed(1)).join(' ');
    const hoverIdx = st.hover === null ? null : Math.max(0, Math.min(pts.length - 1, st.hover));
    const hp = hoverIdx === null ? null : pts[hoverIdx];
    const unit = (v) => (growth ? F.num(v, 1) : money(v));

    /* drawdown band, from the peak month to the trough month */
    const keyIndex = (k) => { for (let i = 0; i < pts.length; i++) { if (pts[i].key === k) return i; } return -1; };
    const ddA = run ? keyIndex(run.stats.drawdownPeak) : -1;
    const ddB = run ? keyIndex(run.stats.drawdownTrough) : -1;
    const ddBand = ddA >= 0 && ddB > ddA;

    const tickCount = Math.min(7, Math.max(2, pts.length));
    const xTicks = [];
    for (let i = 0; i < tickCount; i++) {
      const idx = Math.round(i / (tickCount - 1) * (pts.length - 1));
      xTicks.push({ label: pts[idx] ? (pts[idx].isStart ? 'Start' : pts[idx].short) : '' });
    }

    /* ---- weights editor --------------------------------------------------- */
    const weightRows = s.weights.map((w, i) => {
      const row = byT[w.ticker];
      const a = row ? D.labAnchor(row) : null;
      return {
        mono: row ? row.mono : w.ticker.slice(0, 2),
        ticker: w.ticker, name: row ? row.name : 'unknown ticker',
        anchor: a
          ? F.caret(a.annual * 100, 1) + ' a year · ' + a.source + (row.yieldPct ? ' · ' + F.pct(row.yieldPct, 2) + ' yield' : ' · no dividend')
          : 'not in the universe — excluded from the run',
        draft: st.drafts[w.ticker] === undefined ? F.num(this.num(w.weight), 2) : st.drafts[w.ticker],
        onChange: (e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, '');
          const drafts = Object.assign({}, st.drafts); drafts[w.ticker] = raw;
          const next = s.weights.map((z, j) => (j === i ? { ticker: z.ticker, weight: this.num(raw) } : z));
          this.patch(D, { weights: next }, { drafts: drafts, hover: null });
        },
        onRemove: () => {
          const drafts = Object.assign({}, st.drafts); delete drafts[w.ticker];
          this.patch(D, { weights: s.weights.filter((z) => z.ticker !== w.ticker) }, { drafts: drafts, hover: null });
        }
      };
    });

    const q = st.query.trim().toLowerCase();
    const chosen = {};
    s.weights.forEach((w) => { chosen[w.ticker] = true; });
    const candidates = sec.filter((r) => !chosen[r.ticker])
      .filter((r) => !q || r.ticker.toLowerCase().indexOf(q) >= 0 || r.name.toLowerCase().indexOf(q) >= 0)
      .sort((a, b) => (a.held === b.held ? b.yieldPct - a.yieldPct : a.held ? -1 : 1))
      .slice(0, q ? 7 : 5);
    const addTicker = (t) => () => {
      const room = Math.max(0, 100 - wsum);
      const w = room > 0.5 ? Math.round(room * 100) / 100 : 5;
      this.patch(D, { weights: s.weights.concat([{ ticker: t, weight: w }]) }, { query: '', drafts: {}, hover: null });
    };

    /* ---- comparison ------------------------------------------------------- */
    const cols = list.map((x, i) => ({ kind: 'scen', i: i, name: (LETTERS[i] || i + 1) + ' · ' + (x.name || 'Scenario'), run: runs[i], x: x }))
      .concat([{ kind: 'bench', name: K.benchmark, run: null, x: null }]);
    const cmpCols = 'minmax(190px,1fr) repeat(' + cols.length + ',minmax(130px,0.8fr))';
    const cell = (v, tone, strong) => ({
      value: v, color: tone === 'pos' ? 'var(--accent)' : tone === 'neg' ? 'var(--neg)' : 'var(--t1)',
      weight: strong ? 600 : 400, bg: 'transparent'
    });
    const bench = run ? run.benchmark : null;
    const cmpRow = (label, sub, fn, alt) => ({
      label: label, sub: sub, bg: alt ? 'var(--hover)' : 'transparent',
      cells: cols.map((c) => (c.kind === 'bench'
        ? (bench ? fn({ stats: null, bench: bench }, true) : cell('—'))
        : (c.run ? fn(c.run, false) : cell('—'))))
    });
    const B = (r) => (r.bench ? r.bench : null);
    const cmpRows = [
      cmpRow('Window', run ? run.stats.months + ' months' : '', (r, isB) => cell(isB ? K.benchmark + ' path' : r.stats.fromShort + ' – ' + r.stats.toShort), false),
      cmpRow('Money in', 'start + contributions', (r, isB) => cell(isB ? money(run.stats.contributed) : money(r.stats.contributed)), true),
      cmpRow('Ends at', 'value on the last month', (r, isB) => cell(isB ? money(B(r).finalValue) : money(r.stats.finalValue), null, true), false),
      cmpRow('CAGR', 'chain-linked, annualised', (r, isB) => cell(F.caret(isB ? B(r).cagr : r.stats.cagr, 2), (isB ? B(r).cagr : r.stats.cagr) >= 0 ? 'pos' : 'neg', true), true),
      cmpRow('Total return', 'on money invested', (r, isB) => cell(F.caret(isB ? B(r).moneyReturn : r.stats.moneyReturn, 2), (isB ? B(r).moneyReturn : r.stats.moneyReturn) >= 0 ? 'pos' : 'neg'), false),
      cmpRow('Max drawdown', 'on growth of $1', (r, isB) => cell(F.pct(isB ? B(r).maxDrawdown : r.stats.maxDrawdown, 2), 'neg'), true),
      cmpRow('Volatility', 'annualised, monthly returns', (r, isB) => cell(F.pct(isB ? B(r).volatility : r.stats.volatility, 2)), false),
      cmpRow('Sharpe', 'risk-free ' + (run ? F.pct(run.stats.riskFree, 2) : '—') + ' (BIL)', (r, isB) => cell(F.num(isB ? B(r).sharpe : r.stats.sharpe, 3)), true),
      cmpRow('Down months', 'out of ' + (run ? run.stats.months : 0), (r, isB) => cell(String(isB ? B(r).downMonths : r.stats.downMonths)), false),
      cmpRow('Dividends collected', 'net of ' + F.pct(K.withholdingTax * 100, 0) + ' withholding', (r, isB) => cell(isB ? '—' : money(r.stats.dividendsNet)), true),
      cmpRow('Holdings', 'names in the mix', (r, isB) => cell(isB ? '1' : String(r.legs.length)), false)
    ];

    /* ---- per-holding table ------------------------------------------------ */
    const legs = run ? run.legs.slice().sort((a, b) => b.value - a.value) : [];
    const heldCount = legs.filter((l) => l.held).length;

    const statCell = (label, primary, tone, secondary, note, tip, first) => ({
      label: label, primary: primary, tone: tone, secondary: secondary, note: note, tip: tip,
      border: first ? 'none' : '1px solid var(--line)'
    });

    return Object.assign(base, {
      portfolioName: K.portfolioName,
      headNote: run
        ? 'Backtest over ' + run.stats.from + ' – ' + run.stats.to + ' · ' + run.stats.months
          + ' months, the whole history this app has · ' + money(run.stats.contributed) + ' in, '
          + money(run.stats.finalValue) + ' out · ' + list.length + (list.length === 1 ? ' scenario' : ' scenarios')
        : 'Pick tickers, set weights and a starting amount to run a backtest.',
      titleTip: st.titleTip,
      titleTipOn: () => this.setState({ titleTip: true }),
      titleTipOff: () => this.setState({ titleTip: false }),
      titleTipText: 'Nothing here is a forecast and nothing is a measurement of the real market. Each ticker’s path is generated by the same engine that draws the portfolio history, pinned to one published annual figure — a held name uses its own IRR, everything else uses yield plus 5-year dividend growth. The month-to-month wobble around that anchor is synthetic, so drawdown, volatility and Sharpe describe the shape of a plausible path, not what actually happened.',

      tabs: tabs,
      activeName: (LETTERS[ai] || ai + 1) + ' · ' + (s.name || 'Scenario'),
      canAdd: list.length < 3,
      canRemove: list.length > 1,
      onAddScenario: () => {
        const copy = Object.assign({}, s, {
          name: (s.name || 'Scenario') + ' variant',
          weights: s.weights.map((w) => ({ ticker: w.ticker, weight: this.num(w.weight) }))
        });
        this.commit(list.concat([copy]), { active: list.length, drafts: {}, amountDraft: null, monthlyDraft: null, nameDraft: null });
      },
      onRemoveScenario: () => {
        const next = list.filter((z, i) => i !== ai);
        this.commit(next, { active: Math.max(0, ai - 1), drafts: {}, amountDraft: null, monthlyDraft: null, nameDraft: null });
      },
      onResetAll: () => {
        D.clearLabScenarios();
        this.setState({ scen: null, active: 0, drafts: {}, amountDraft: null, monthlyDraft: null, nameDraft: null, query: '', hover: null });
      },
      onLoadMine: () => this.patch(D, {
        name: 'My portfolio', weights: D.labMyPortfolio(), amount: Math.round(T.invested)
      }, { drafts: {}, amountDraft: null, nameDraft: null, hover: null }),

      nameDraft: st.nameDraft === null ? (s.name || '') : st.nameDraft,
      onName: (e) => this.patch(D, { name: e.target.value }, { nameDraft: e.target.value }),
      amountDraft: st.amountDraft === null ? F.num(s.amount, 0) : st.amountDraft,
      onAmount: (e) => {
        const raw = e.target.value.replace(/[^0-9.]/g, '');
        this.patch(D, { amount: this.num(raw) }, { amountDraft: raw, hover: null });
      },
      monthlyDraft: st.monthlyDraft === null ? F.num(s.monthly, 0) : st.monthlyDraft,
      onMonthly: (e) => {
        const raw = e.target.value.replace(/[^0-9.]/g, '');
        this.patch(D, { monthly: this.num(raw) }, { monthlyDraft: raw, hover: null });
      },
      windowPickers: [
        { id: 'from', label: span[s.from] ? span[s.from].short : '', value: s.from },
        { id: 'to', label: span[s.to] ? span[s.to].short : '', value: s.to }
      ].map((w) => ({
        label: (w.id === 'from' ? 'from ' : 'to ') + w.label,
        border: st.menu === w.id ? 'var(--accent)' : 'var(--line)',
        open: st.menu === w.id,
        onToggle: (e) => { e.stopPropagation(); this.setState({ menu: st.menu === w.id ? null : w.id }); },
        options: span.map((mo, i) => ({
          label: mo.short, check: i === w.value ? 1 : 0,
          bg: i === w.value ? 'var(--accent-soft)' : 'transparent',
          color: i === w.value ? 'var(--accent)' : 'var(--t1)',
          weight: i === w.value ? 600 : 400,
          onClick: (e) => {
            e.stopPropagation();
            const from = w.id === 'from' ? Math.min(i, s.to - 1) : s.from;
            const to = w.id === 'to' ? Math.max(i, s.from + 1) : s.to;
            this.patch(D, { from: Math.max(0, from), to: Math.min(span.length - 1, to) }, { menu: null, hover: null });
          }
        }))
      })),
      togReinvest: () => this.patch(D, { reinvest: s.reinvest === false }, { hover: null }),
      reinvestMark: s.reinvest !== false ? '✓' : '',
      reinvestBg: s.reinvest !== false ? 'var(--accent-soft)' : 'transparent',
      reinvestBorder: s.reinvest !== false ? 'var(--accent)' : 'var(--line)',
      reinvestBoxBg: s.reinvest !== false ? 'var(--accent)' : 'transparent',
      reinvestBoxBorder: s.reinvest !== false ? 'var(--accent)' : 'var(--t3)',

      stats: run ? [
        statCell('CAGR', F.caret(run.stats.cagr, 2), run.stats.cagr >= 0 ? 'pos' : 'neg',
          K.benchmark + ' ' + F.caret(run.benchmark.cagr, 2), F.num(run.stats.years, 2) + ' years',
          'Chain-linked monthly return over the window, annualised — contribution-neutral, so a bigger monthly deposit does not flatter it.', true),
        statCell('Total return', F.caret(run.stats.moneyReturn, 2), run.stats.moneyReturn >= 0 ? 'pos' : 'neg',
          money(run.stats.profit) + ' on ' + money(run.stats.contributed), 'money-weighted',
          'Profit against every dollar put in, start plus contributions. Unlike CAGR this does depend on when the money arrived.'),
        statCell('Max drawdown', F.pct(run.stats.maxDrawdown, 2), 'neg',
          run.stats.drawdownPeak && run.stats.drawdownTrough
            ? run.stats.drawdownPeak + ' → ' + run.stats.drawdownTrough : 'no losing stretch',
          'growth of $1',
          'Deepest peak-to-trough fall of the growth-of-$1 index, not of the money line — a portfolio still taking deposits never shows its real drawdown on a value chart.'),
        statCell('Volatility', F.pct(run.stats.volatility, 2), 'plain',
          K.benchmark + ' ' + F.pct(run.benchmark.volatility, 2), run.stats.downMonths + ' down months',
          'Standard deviation of the monthly returns, annualised. It comes from the synthetic dispersion around each anchor, so read it as scale, not as a measured figure.'),
        statCell('Sharpe', F.num(run.stats.sharpe, 3), 'plain',
          K.benchmark + ' ' + F.num(run.benchmark.sharpe, 3), 'risk-free ' + F.pct(run.stats.riskFree, 2),
          'Excess return per unit of volatility, over the BIL yield the portfolio actually holds. Calibrated identically to Analytics ▸ Metrics, and window-wide only.'),
        statCell('Dividends collected', money(run.stats.dividendsNet), 'plain',
          money(run.stats.dividendsGross) + ' gross', F.pct(run.stats.incomeYield, 2) + ' a year on end value',
          'Every payment the mix would have made across the window, at each name’s current yield and payment frequency, net of ' + F.pct(K.withholdingTax * 100, 0) + ' withholding.')
      ] : [
        statCell('CAGR', '—', 'plain', '', 'no run', 'Add at least one ticker with a weight above zero and a starting amount or monthly contribution.', true),
        statCell('Total return', '—', 'plain', '', '', ''),
        statCell('Max drawdown', '—', 'plain', '', '', ''),
        statCell('Volatility', '—', 'plain', '', '', ''),
        statCell('Sharpe', '—', 'plain', '', '', ''),
        statCell('Dividends collected', '—', 'plain', '', '', '')
      ],

      hasRun: !!run, noRun: !run,
      noRunTitle: s.weights.length === 0 ? 'Nothing to run yet' : 'Set an amount to run',
      noRunBody: s.weights.length === 0
        ? 'Add tickers on the right — or load the 12 positions you hold and vary them from there.'
        : 'A backtest needs a starting amount, a monthly contribution, or both.',

      chartTitle: growth ? 'Growth of $1' : 'Equity curve',
      chartSpan: run
        ? run.stats.from + ' – ' + run.stats.to + ' · ' + run.stats.months + ' months · '
          + (s.reinvest !== false ? 'dividends reinvested' : 'dividends held in cash')
        : '',
      chartLegend: run ? [
        { label: s.name || 'Scenario', value: growth ? F.num(run.stats.twr + 100, 1) : money(run.stats.finalValue), color: 'var(--accent)', stroke: '2px solid var(--accent)' }
      ].concat(showBench ? [
        { label: K.benchmark, value: growth ? F.num(run.benchmark.twr + 100, 1) : money(run.benchmark.finalValue), color: 'var(--t2)', stroke: '2px dashed var(--grey-series)' }
      ] : []).concat(showInvested ? [
        { label: 'Money in', value: money(run.stats.contributed), color: 'var(--t2)', stroke: '1px dotted var(--t3)' }
      ] : []) : [],
      grid: [0, 1, 2, 3, 4].map((i) => {
        const v = lo + (hi - lo) * (1 - i / 4);
        return { y: (10 + i * 60).toFixed(0), top: (10 + i * 60) + 'px', label: growth ? F.num(v, 0) : F.k(v) };
      }),
      linePath: pathOf((v) => v.me),
      areaPath: pts.length ? pathOf((v) => v.me) + ' L1000 250 L0 250 Z' : '',
      benchPath: pathOf((v) => v.bench),
      investedPath: pathOf((v) => v.invested),
      showBench: showBench && pts.length > 1,
      showInvested: showInvested && pts.length > 1,
      ddBand: ddBand,
      ddX: ddBand ? x(ddA).toFixed(1) : '0',
      ddW: ddBand ? (x(ddB) - x(ddA)).toFixed(1) : '0',
      chartMove: (e) => { if (pts.length) this.setState({ hover: this.indexAt(e, pts.length) }); },
      chartLeave: () => this.setState({ hover: null }),
      hover: hp !== null,
      cursorX: hp !== null ? x(hoverIdx).toFixed(1) : '0',
      dotLeft: hp !== null ? (hoverIdx / Math.max(1, pts.length - 1) * 100).toFixed(2) + '%' : '0%',
      dotTop: hp !== null ? y(vals[hoverIdx].me).toFixed(1) + 'px' : '0px',
      tipLeft: hp !== null ? Math.min(88, Math.max(12, hoverIdx / Math.max(1, pts.length - 1) * 100)).toFixed(2) + '%' : '0%',
      tip: hp === null ? null : {
        title: hp.isStart ? 'Start of the window' : hp.key,
        headline: unit(vals[hoverIdx].me),
        sub: hp.isStart ? 'before the first month' : 'month ' + hoverIdx + ' of ' + run.stats.months,
        rows: [
          { label: K.benchmark + ', same schedule', value: unit(vals[hoverIdx].bench), color: 'var(--grey-series)' },
          { label: 'Money in', value: money(hp.invested), color: 'var(--t3)' },
          { label: 'Dividends this month', value: hp.isStart ? '—' : money(hp.dividends), color: 'var(--accent)' },
          { label: 'Dividends to date', value: money(hp.dividendsToDate), color: 'var(--accent)' }
        ],
        footer: hp.isStart ? '' : 'Month return ' + F.caret(hp.monthReturn, 2) + ' · ' + K.benchmark + ' ' + F.caret(hp.benchmarkReturn, 2),
        footerTone: hp.isStart ? 'neutral' : hp.monthReturn >= 0 ? 'pos' : 'neg'
      },
      xTicks: xTicks,
      chartFoot: run ? [
        { label: 'Against ' + K.benchmark, value: F.caret(run.stats.cagr - run.benchmark.cagr, 2) + ' a year', color: run.stats.cagr >= run.benchmark.cagr ? 'var(--accent)' : 'var(--neg)' },
        { label: 'Worst stretch', value: run.stats.drawdownPeak ? F.pct(run.stats.maxDrawdown, 2) + ' · ' + run.stats.drawdownPeak + ' → ' + run.stats.drawdownTrough : 'none', color: 'var(--t1)' },
        { label: 'Beta', value: F.num(run.stats.beta, 3) + ' vs ' + K.benchmark, color: 'var(--t1)' }
      ] : [],

      sumLabel: sumOff
        ? 'Weights sum to ' + F.pct(wsum, 2) + ' · ' + F.num(Math.abs(wsum - 100), 2) + 'pp ' + (wsum > 100 ? 'over' : 'under')
        : 'Weights sum to 100%',
      sumBg: sumOff ? 'var(--tag-bg)' : 'var(--accent-soft)',
      sumFg: sumOff ? 'var(--tag-fg)' : 'var(--accent)',
      sumOff: sumOff,
      onNormalise: () => {
        if (!wsum) return;
        let acc = 0;
        const next = s.weights.map((w, i) => {
          if (i === s.weights.length - 1) return { ticker: w.ticker, weight: Math.round((100 - acc) * 100) / 100 };
          const v = Math.round(this.num(w.weight) / wsum * 10000) / 100;
          acc = Math.round((acc + v) * 100) / 100;
          return { ticker: w.ticker, weight: v };
        });
        this.patch(D, { weights: next }, { drafts: {} });
      },
      onEven: () => {
        if (!s.weights.length) return;
        const n = s.weights.length, each = Math.round(100 / n * 100) / 100;
        const next = s.weights.map((w, i) => ({
          ticker: w.ticker,
          weight: i === n - 1 ? Math.round((100 - each * (n - 1)) * 100) / 100 : each
        }));
        this.patch(D, { weights: next }, { drafts: {} });
      },
      weightRows: weightRows,
      noWeights: s.weights.length === 0,
      query: st.query,
      onQuery: (e) => this.setState({ query: e.target.value }),
      picks: candidates.map((r) => ({
        mono: r.mono, ticker: r.ticker, tag: r.held ? 'held' : '',
        sub: r.name + ' · ' + r.sector,
        yield: r.yieldPct ? F.pct(r.yieldPct, 2) : 'no dividend',
        onClick: addTicker(r.ticker)
      })),
      noPicks: candidates.length === 0,
      noPicksNote: q ? 'No name in the ' + sec.length + '-security universe matches “' + st.query.trim() + '”.' : 'Every security in the universe is already in this mix.',

      honestyNote: run ? run.stats.months + ' months of history' : '',
      honesty: [
        {
          tone: 'var(--amber)', title: 'The window is the app’s own history',
          body: 'The portfolio starts in ' + span[0].key + ' and the last closed month is ' + span[span.length - 1].key
            + '. There is no data before that, so a backtest cannot reach further back — every window here is a slice of those '
            + span.length + ' months, which is a thin sample for anything annualised.'
        },
        {
          tone: 'var(--line)', title: 'Each name is pinned to one published number',
          body: 'A name you hold compounds at its own IRR (' + heldCount + ' of ' + legs.length
            + ' in this mix). Everything else compounds at yield plus 5-year dividend growth — a Gordon proxy, not a price history. Two names with the same anchor follow different paths only because the generator is seeded per ticker.'
        },
        {
          tone: 'var(--line)', title: 'Drawdown, volatility and Sharpe are shape',
          body: 'The wobble around each anchor is synthetic. It is scaled by asset class — funds move less than single stocks, the money-market line not at all — and it is what produces those three figures. Read them as an order of magnitude; the CAGR and the dividend total are the parts tied to real published inputs.'
        },
        {
          tone: 'var(--line)', title: 'No rebalancing, no fees, no tax on gains',
          body: 'Weights are set once and then drift as the paths diverge. Dividends are taxed at ' + F.pct(K.withholdingTax * 100, 0)
            + ' withholding' + (s.reinvest !== false ? ' and reinvested into the name that paid them' : ' and held in cash') + '. Trading costs and capital-gains tax are ignored, exactly as on the rebalancing screen.'
        }
      ],

      cmpNote: list.length > 1
        ? list.length + ' scenarios and ' + K.benchmark + ' · same window, same deposit schedule'
        : 'Duplicate this scenario to compare a variation against it',
      cmpCols: cmpCols,
      cmpHead: cols.map((c, i) => ({
        name: c.name,
        meta: c.kind === 'bench'
          ? 'same schedule, index path'
          : (c.x.weights.length + (c.x.weights.length === 1 ? ' name · ' : ' names · ') + money(c.x.amount) + (c.x.monthly ? ' + ' + money(c.x.monthly) + '/mo' : '')),
        bg: c.kind === 'scen' && c.i === ai ? 'var(--accent-soft)' : 'transparent',
        color: c.kind === 'scen' && c.i === ai ? 'var(--accent)' : 'var(--t1)'
      })),
      cmpRows: cmpRows,

      legTitle: 'Inside ' + (s.name || 'this scenario'),
      legNote: run
        ? legs.length + (legs.length === 1 ? ' name · ' : ' names · ') + heldCount + ' held today · weights drift, nothing is rebalanced'
        : '',
      legHead: [
        { label: 'Holding', justify: 'flex-start' },
        { label: 'Weight', justify: 'flex-end' },
        { label: 'Return anchor', justify: 'flex-start' },
        { label: 'Ends at', justify: 'flex-end' },
        { label: 'Dividends', justify: 'flex-end' }
      ],
      legRows: legs.map((l) => ({
        mono: l.mono, ticker: l.ticker, name: l.name,
        weight: F.pct(l.share, 2),
        weightSub: sumOff ? 'entered ' + F.pct(l.weight, 2) : l.sector,
        anchor: F.caret(l.anchorAnnual, 1) + ' a year',
        anchorSub: l.anchorSource,
        ends: money(l.value),
        endsSub: F.caret(l.growth, 2) + ' on ' + money(l.contributed),
        endsTone: l.growth >= 0 ? 'pos' : 'neg',
        dividends: money(l.dividends),
        dividendsSub: l.yieldPct ? F.pct(l.yieldPct, 2) + ' · ' + l.frequency.toLowerCase() : 'none'
      })),
      legTotalSub: run ? legs.length + ' names · ' + run.stats.months + ' months' : '',
      legTotalWeight: '100.00%',
      legTotalWeightSub: sumOff ? 'normalised from ' + F.pct(wsum, 2) : 'as entered',
      legTotalAnchor: run
        ? 'weighted anchor ' + F.caret(legs.reduce((a, l) => a + l.anchorAnnual * l.share / 100, 0), 2) + ' a year vs realised CAGR ' + F.caret(run.stats.cagr, 2)
        : '',
      legTotalEnds: run ? money(run.stats.finalValue) : '—',
      legTotalEndsSub: run ? F.caret(run.stats.moneyReturn, 2) + ' on ' + money(run.stats.contributed) : '',
      legTotalTone: run && run.stats.moneyReturn >= 0 ? 'pos' : 'neg',
      legTotalDiv: run ? money(run.stats.dividendsNet) : '—',
      legTotalDivSub: run ? money(run.stats.dividendsGross) + ' gross' : '',

      footnote: run
        ? 'This is a what-if, not a record. The window is fixed to the app’s own monthly history — ' + span[0].key + ' to '
          + span[span.length - 1].key + ', ' + span.length + ' months — because nothing earlier exists to test against. Within it, each name’s monthly path comes from the same generator that draws the portfolio value chart, pinned to one published annual figure per name: the position’s IRR where you hold it, yield plus 5-year dividend growth where you do not. '
          + 'Dividends are paid at each name’s current yield on its running value, at its real frequency, net of ' + F.pct(K.withholdingTax * 100, 0) + ' withholding — ' + money(run.stats.dividendsNet) + ' across this window. '
          + 'CAGR is chain-linked and contribution-neutral; total return is money-weighted and is not. Max drawdown, volatility, Sharpe and beta are computed over the whole selected window only, with the same calibration Analytics ▸ Metrics uses, and they derive from synthetic month-to-month dispersion — the risk figures are the shape of a plausible path, not a measurement. Weights are normalised to run whatever they sum to on screen'
          + (sumOff ? ' — yours sum to ' + F.pct(wsum, 2) + ', so the mix shown is scaled' : '')
          + '. No rebalancing, no trading costs, no tax on gains, and nothing here is advice.'
        : 'Weights are normalised to run whatever they sum to on screen. The window is fixed to the app’s own monthly history, ' + span[0].key + ' to ' + span[span.length - 1].key + '.'
    });
  }
}
