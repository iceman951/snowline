// @ts-nocheck
/** Presentation and chart geometry from Cash.dc.html; data comes from the core engine. */
import { Presenter } from "./presenter.svelte";
export default class CashPresenter extends Presenter {
  state = { menu: null, titleTip: false, filter: null, query: '', searchOpen: false, limit: null, hover: null };

  componentDidMount() {
    this.doc = () => { if (this.state.menu) this.setState({ menu: null }); };
    document.addEventListener('click', this.doc);

  }
  componentWillUnmount() { if (this.doc) document.removeEventListener('click', this.doc); }

  niceMax(v) {
    if (v <= 0) return 1;
    const e = Math.pow(10, Math.floor(Math.log10(v)));
    return ([1, 2, 2.5, 5, 10].map((m) => m * e).filter((s) => s >= v)[0]) || e * 10;
  }

  renderVals() {
    const st = Object.assign({}, this.state);
    const pageSize = Math.max(5, Math.round(this.getProps().pageSize || 25));
    if (st.filter === null) st.filter = this.getProps().defaultFilter || 'All';
    if (st.limit === null) st.limit = pageSize;
    const I = {
      bars: 'M4 20V10M10 20V4M16 20v-7M22 20H2', table: 'M3 5h18v14H3V5Zm0 5h18M9 10v9',
      home: 'M4 11l8-7 8 7v9H4v-9Zm5 9v-6h6v6',
      scale: 'M12 4v16M6 8l-3 6h6l-3-6Zm12 0l-3 6h6l-3-6ZM5 8h14', dots: 'M5 12h.01M12 12h.01M19 12h.01'
    };
    const base = {
      tabRows: [
        { label: 'Dashboard', d: I.home, href: '/', color: 'var(--t3)' },
        { label: 'Analytics', d: I.bars, href: '/analytics', color: 'var(--t3)' },
        { label: 'Portfolio', d: I.table, href: '/portfolio/holdings', color: 'var(--accent)' },
        { label: 'Tools', d: I.scale, href: '/tools/rebalancing', color: 'var(--t3)' }
      ],
      stop: (e) => e.stopPropagation()
    };
    if (!this.data) return base;

    const D = this.data, F = D.fmt, K = D.constants, T = D.totals();
    const cf = D.cashFlow(), cs = D.cashStats();
    const money = (v) => F.money(v);

    /* ---- movements ---- */
    const GROUPS = {
      All: null, Deposits: ['Deposit'], Withdrawals: ['Withdrawal'],
      Purchases: ['Buy'], Proceeds: ['Sell'], Dividends: ['Dividend']
    };
    const TYPE = {
      Deposit: { dot: 'var(--accent)', bg: 'var(--accent-soft)', fg: 'var(--accent)' },
      Sell: { dot: 'var(--accent-2)', bg: 'var(--hover)', fg: 'var(--t1)' },
      Dividend: { dot: 'var(--accent-3)', bg: 'var(--hover)', fg: 'var(--t1)' },
      Buy: { dot: 'var(--grey-series)', bg: 'var(--hover)', fg: 'var(--t2)' },
      Withdrawal: { dot: 'var(--t2)', bg: 'var(--hover)', fg: 'var(--t2)' }
    };
    const q = st.query.trim().toLowerCase();
    const keep = cf.rows.filter((r) => {
      const g = GROUPS[st.filter];
      if (g && g.indexOf(r.type) < 0) return false;
      if (!q) return true;
      return ((r.ticker || '') + ' ' + r.label + ' ' + r.type).toLowerCase().indexOf(q) >= 0;
    });
    const shown = keep.slice(0, st.limit);
    const filtered = st.filter !== 'All' || q;
    const kept = { in: keep.filter((r) => r.signed > 0).reduce((a, r) => a + r.amount, 0), out: keep.filter((r) => r.signed < 0).reduce((a, r) => a + r.amount, 0) };

    /* ---- monthly flow chart ---- */
    const months = cf.months;
    const peak = Math.max.apply(null, months.map((m) => Math.max(m.inflow, m.outflow)).concat([1]));
    const axis = this.niceMax(peak);
    const hov = st.hover === null || st.hover === undefined ? null : months[st.hover];
    const flowTicks = [1, 0.5, 0, -0.5, -1].map((f) => ({
      label: f === 0 ? '$0' : (f < 0 ? '-' : '+') + '$' + F.num(Math.abs(f) * axis / 1000, axis >= 10000 ? 0 : 1) + 'k',
      top: (100 - (f + 1) / 2 * 100) * 0.906 + '%',
      color: f === 0 ? 'var(--t3)' : 'transparent',
      border: f === 0 ? 'none' : '1px dashed var(--tick, var(--line))'
    }));

    return Object.assign(base, {
      portfolioName: K.portfolioName,
      headNote: cf.currency + ' ' + money(cf.balance) + ' \u00b7 ' + F.pct(cs.weight, 2)
        + ' of the portfolio \u00b7 ' + cf.count + ' movements since ' + cf.rows[cf.rows.length - 1].date,
      titleTip: st.titleTip,
      titleTipOn: () => this.setState({ titleTip: true }),
      titleTipOff: () => this.setState({ titleTip: false }),
      titleTipText: 'Cash is the ' + cs.positions.map((p) => p.ticker).join(', ')
        + ' money-market line. Deposits and withdrawals are not stored anywhere \u2014 they are solved from the '
        + D.ledger().length + ' dated rows that moved cash, under one rule: top up before a purchase would take the balance below the '
        + money(cf.float) + ' float, sweep back anything more than $500 above it after money comes in.',

      togMore: (e) => { e.stopPropagation(); this.setState({ menu: st.menu === 'more' ? null : 'more' }); },
      mMore: st.menu === 'more',
      moreBg: st.menu === 'more' ? 'var(--hover)' : 'var(--card)',
      moreRows: [
        { label: 'Clear filters', onClick: (e) => { e.stopPropagation(); this.setState({ filter: 'All', query: '', searchOpen: false, limit: pageSize, menu: null }); } },
        { label: 'Show every movement', onClick: (e) => { e.stopPropagation(); this.setState({ limit: cf.count, menu: null }); } },
        { label: 'Open transactions', onClick: (e) => { e.stopPropagation(); this.setState({ menu: null }); window.location.href = '/portfolio/transactions'; } }
      ],

      kpis: [
        {
          label: 'Cash balance', tip: 'The money-market line, which is what this portfolio holds instead of an idle cash account.',
          primary: money(cf.balance), tone: 'plain',
          secondary: F.pct(cs.yieldPct, 2), note: 'yield \u00b7 ' + money(cs.monthlyIncome) + ' a month',
          footA: cs.positions.length + (cs.positions.length === 1 ? ' cash line' : ' cash lines'),
          footB: money(cs.income) + ' a year'
        },
        {
          label: 'Share of portfolio', tip: 'Cash against total portfolio value, and against the target weight set for the Cash category.',
          primary: F.pct(cs.weight, 2), tone: 'plain',
          delta: (cs.drift >= 0 ? '\u25b2' : '\u25bc') + F.num(Math.abs(cs.drift), 2) + 'pp',
          deltaTone: cs.drift > 0 ? 'neg' : 'pos',
          secondary: F.pct(cs.target, 0), note: 'target',
          footA: money(cs.cash), footB: 'of ' + money(T.value)
        },
        {
          label: 'Net deposits', tip: 'Everything paid in, less everything swept back out, over the life of the portfolio.',
          primary: money(cf.netDeposits), tone: 'plain',
          secondary: money(cf.deposits), note: 'in',
          footA: cf.depositCount + ' deposits', footB: cf.withdrawalCount + ' withdrawals \u00b7 ' + money(cf.withdrawals) + ' out'
        },
        {
          label: 'Cash drag', tip: 'What holding cash costs a year: the cash weight times the gap between the expected portfolio return and the cash yield.',
          primary: F.num(cs.dragPct, 2) + 'pp', tone: 'plain',
          secondary: money(cs.dragAnnual), note: 'a year forgone',
          footA: F.pct(cs.expectedReturn, 2) + ' expected', footB: F.pct(cs.yieldPct, 2) + ' on cash'
        }
      ],

      balancesNote: cf.currency + ' is the base currency \u00b7 no other currency is held',
      curHead: [
        { label: 'Currency', justify: 'flex-start' }, { label: 'Balance', justify: 'flex-end' },
        { label: 'Share', justify: 'flex-end' }, { label: 'Yield', justify: 'flex-end' },
        { label: 'Income a year', justify: 'flex-end' }
      ],
      curRows: D.cashByCurrency().map((c) => ({
        currency: c.currency, symbol: c.currency.slice(0, 2),
        sub: c.isBase ? 'base currency' : 'converted at ' + F.num(1, 4),
        balance: money(c.balance), inBase: money(c.inBase) + ' in ' + K.baseCurrency,
        share: F.pct(c.pct, 1), yield: F.pct(c.yieldPct, 2),
        income: money(c.income), monthly: money(c.income / 12) + ' a month'
      })),
      holdRows: cs.positions.map((p) => ({
        ticker: p.ticker, name: p.name, mono: p.mono,
        value: money(p.value), freq: p.frequency + ' distribution',
        yield: F.pct(p.yieldPct, 2), income: money(p.income) + ' a year',
        caveat: p.caveat || ''
      })),

      dragHead: F.pct(cs.weight, 2) + ' held in cash',
      gaugeMin: 0, gaugeMax: 20,
      gaugeMinLabel: '0% fully invested', gaugeMaxLabel: '20% heavy in cash',
      gaugeTicks: [0, 5, 10, 15, 20],
      gaugeMarkers: [
        { value: cs.weight, label: 'now', display: F.pct(cs.weight, 2), primary: true },
        { value: cs.target, label: 'target', display: F.pct(cs.target, 0), primary: false, shape: 'diamond' }
      ],
      gaugeStatement: 'Cash sits ' + F.num(Math.abs(cs.drift), 2) + 'pp ' + (cs.drift >= 0 ? 'above' : 'below') + ' its target weight',
      gaugeVerdict: cs.weight > cs.target + 3 ? 'requires attention' : cs.weight > cs.target + 1 ? 'slightly heavy' : 'o.k.',
      gaugeTone: cs.weight > cs.target + 3 ? 'attention' : cs.weight > cs.target + 1 ? 'neutral' : 'good',
      gaugeNote: 'The cash line yields ' + F.pct(cs.yieldPct, 2) + ', so it is not idle \u2014 the drag is only the '
        + F.num(cs.gap, 2) + 'pp it gives up against the ' + F.pct(cs.expectedReturn, 2)
        + ' return the goal projection assumes.',
      dragRows: [
        { label: 'Cash held', note: 'money-market line at ' + F.pct(cs.yieldPct, 2), value: money(cs.cash), color: 'var(--t1)' },
        { label: 'Target weight', note: F.pct(cs.target, 0) + ' of ' + money(T.value), value: money(T.value * cs.target / 100), color: 'var(--t1)' },
        { label: 'Above target', note: 'could be invested', value: money(cs.cash - T.value * cs.target / 100), color: cs.drift > 0 ? 'var(--amber)' : 'var(--accent)' },
        { label: 'Forgone a year', note: F.num(cs.gap, 2) + 'pp on ' + money(cs.cash), value: money(cs.dragAnnual), color: 'var(--t1)' }
      ],

      flowNote: 'Money in and out of the cash account, ' + months[0].short + ' \u2013 ' + months[months.length - 1].short,
      flowLegend: [{ label: 'In', color: 'var(--accent)' }, { label: 'Out', color: 'var(--grey-series)' }],
      flowTicks: flowTicks,
      flowBars: months.map((m, i) => ({
        label: i === 0 || m.monthIndex === 0 || m.monthIndex === 6 ? m.short : m.label.slice(0, 1),
        inH: Math.max(m.inflow > 0 ? 2 : 0, m.inflow / axis * 96).toFixed(1) + 'px',
        outH: Math.max(m.outflow > 0 ? 2 : 0, m.outflow / axis * 96).toFixed(1) + 'px',
        slotBg: st.hover === i ? 'var(--hover)' : 'transparent',
        labelColor: st.hover === i ? 'var(--t1)' : 'var(--t3)',
        onEnter: () => this.setState({ hover: i })
      })),
      flowOff: () => this.setState({ hover: null }),
      tipLeft: hov ? ((st.hover + 0.5) / months.length * 100).toFixed(2) + '%' : '0%',
      tipShift: !hov ? 'none' : (st.hover < months.length * 0.3 ? 'translateX(-8%)' : st.hover > months.length * 0.7 ? 'translateX(-92%)' : 'translateX(-50%)'),
      flowTip: hov ? {
        title: hov.key,
        headline: (hov.net >= 0 ? '+' : '-') + money(Math.abs(hov.net)).replace('-', ''),
        sub: 'net movement \u00b7 closing balance ' + money(hov.end),
        rows: [
          { label: 'Deposits', value: money(hov.deposits), color: 'var(--accent)' },
          { label: 'Dividends', value: money(hov.income), color: 'var(--accent-3)' },
          { label: 'Sale proceeds', value: money(hov.proceeds), color: 'var(--accent-2)' },
          { label: 'Purchases', value: money(hov.invested), color: 'var(--grey-series)' },
          { label: 'Withdrawals', value: money(hov.withdrawals), color: 'var(--t2)' }
        ].filter((r) => r.value !== money(0)),
        footer: money(hov.inflow) + ' in \u00b7 ' + money(hov.outflow) + ' out'
      } : null,
      flowFootnote: 'Purchases include the trade fee. The balance never falls below the ' + money(cf.float)
        + ' float, because the deposits are solved to keep it there.',

      moveNote: filtered
        ? keep.length + ' of ' + cf.count + ' movements \u00b7 ' + money(kept.in) + ' in, ' + money(kept.out) + ' out'
        : cf.count + ' movements \u00b7 ' + money(cf.deposits + cf.proceeds + cf.income) + ' in, ' + money(cf.withdrawals + cf.invested) + ' out',
      searchOpen: st.searchOpen, query: st.query,
      searchBg: st.searchOpen ? 'var(--hover)' : 'var(--card)',
      togSearch: (e) => { e.stopPropagation(); this.setState({ searchOpen: !st.searchOpen, query: '' }); },
      onQuery: (e) => this.setState({ query: e.target.value, limit: pageSize }),
      filters: Object.keys(GROUPS).map((f) => ({
        label: f, onClick: () => this.setState({ filter: f, limit: pageSize }),
        bg: st.filter === f ? 'var(--accent-soft)' : 'transparent',
        color: st.filter === f ? 'var(--accent)' : 'var(--t2)',
        weight: st.filter === f ? 600 : 500
      })),
      moveCols: '128px 124px minmax(220px,1fr) 132px 132px 136px',
      moveHead: [
        { label: 'Date', justify: 'flex-start' }, { label: 'Type', justify: 'flex-start' },
        { label: 'Details', justify: 'flex-start' }, { label: 'In', justify: 'flex-end' },
        { label: 'Out', justify: 'flex-end' }, { label: 'Balance', justify: 'flex-end' }
      ],
      moveRows: shown.map((r) => ({
        date: r.date, type: r.type,
        typeBg: TYPE[r.type].bg, typeFg: TYPE[r.type].fg, typeDot: TYPE[r.type].dot,
        label: r.label, detail: r.detail,
        in: r.signed > 0 ? money(r.amount) : '',
        out: r.signed < 0 ? money(r.amount) : '',
        balance: money(r.balance)
      })),
      isEmpty: keep.length === 0,
      emptyHint: 'No ' + st.filter.toLowerCase() + (q ? ' matching “' + st.query + '”' : '') + ' in this account.',
      pageNote: 'Showing ' + shown.length + ' of ' + keep.length + (filtered ? ' matching movements' : ' movements'),
      hasMore: shown.length < keep.length,
      moreLabel: 'Show ' + Math.min(40, keep.length - shown.length) + ' more',
      showMore: () => this.setState({ limit: st.limit + 40 }),
      footnote: 'The cash account is derived, not stored. Its balance is the ' + cs.positions.map((p) => p.ticker).join(' and ')
        + ' money-market line — ' + money(cf.float) + ' — and every movement above comes from a dated row in the transaction ledger: '
        + money(cf.invested) + ' of purchases including fees out, ' + money(cf.proceeds) + ' of proceeds and '
        + money(cf.income) + ' of dividends in. Deposits and withdrawals are solved so the balance never goes negative and closes exactly on the money-market line: '
        + money(cf.netDeposits) + ' net paid in − ' + money(cf.invested) + ' + ' + money(cf.proceeds) + ' + ' + money(cf.income) + ' = ' + money(cf.balance) + '.'
    });
  }
}
