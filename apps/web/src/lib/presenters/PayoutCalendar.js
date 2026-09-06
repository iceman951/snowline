// @ts-nocheck
/** Presentation and chart geometry from PayoutCalendar.dc.html; data comes from the core engine. */
import { Presenter } from "./presenter.svelte";
export default class PayoutCalendarPresenter extends Presenter {
  state = {
    offset: 0, view: null, sector: null, freq: null, minYield: null, mine: null,
    query: '', menu: null, titleTip: false, hover: null, expand: {}
  };

  componentDidMount() {
    this.doc = () => { if (this.state.menu) this.setState({ menu: null }); };
    document.addEventListener('click', this.doc);

  }
  componentWillUnmount() { if (this.doc) document.removeEventListener('click', this.doc); }

  num(v) { const n = parseFloat(String(v === null || v === undefined ? '' : v).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; }

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
        { label: 'Analytics', d: I.bars, href: '/analytics', color: 'var(--t3)' },
        { label: 'Portfolio', d: I.table, href: '/portfolio/holdings', color: 'var(--t3)' },
        { label: 'Tools', d: I.scale, href: '/tools/payout-calendar', color: 'var(--accent)' }
      ],
      stop: (e) => e.stopPropagation(),
      listCols: 'minmax(190px,1.3fr) minmax(120px,0.9fr) minmax(120px,0.9fr) minmax(120px,0.9fr) 100px minmax(110px,0.8fr) 128px',
      weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => ({ label: d }))
    };
    if (!this.data) return base;

    const D = this.data, F = D.fmt, K = D.constants;
    const money = (v) => F.money(v);
    const stats = D.universeStats();

    /* same three statuses and the same colours as the portfolio calendar */
    const STATUS = {
      Paid: { color: 'var(--accent)', bg: 'var(--accent-soft)', fg: 'var(--accent)' },
      Declared: { color: 'var(--accent-3)', bg: 'var(--hover)', fg: 'var(--t1)' },
      Estimated: { color: 'var(--grey-series)', bg: 'var(--hover)', fg: 'var(--t2)' }
    };

    const view = st.view || (this.getProps().startView === 'List' ? 'List' : 'Calendar');
    const sector = st.sector === null ? (this.getProps().sector && this.getProps().sector !== 'All sectors' ? this.getProps().sector : null) : st.sector;
    const freq = st.freq === null ? (this.getProps().frequency && this.getProps().frequency !== 'All' ? this.getProps().frequency : null) : st.freq;
    const minYieldDraft = st.minYield === null ? String(this.getProps().minYield === undefined ? 0 : this.getProps().minYield) : st.minYield;
    const mine = st.mine === null ? this.getProps().holdingsOnly === true : st.mine;
    const minY = this.num(minYieldDraft);
    const q = st.query.trim().toLowerCase();

    const keep = (e) => {
      if (sector && e.sector !== sector) return false;
      if (freq && e.frequency !== freq) return false;
      if (e.yieldPct < minY) return false;
      if (mine && !e.held) return false;
      if (!q) return true;
      return (e.ticker + ' ' + e.name).toLowerCase().indexOf(q) >= 0;
    };
    const filtered = !!(sector || freq || minY > 0 || mine || q);

    /* month + the twelve-month strip, both filtered identically */
    const baseMi = K.today.monthIndex + st.offset;
    const year = K.today.year + Math.floor(baseMi / 12);
    const mi = ((baseMi % 12) + 12) % 12;
    const raw = D.marketCalendarMonth(year, mi);
    const events = raw.events.filter(keep);

    const strip = D.marketCalendarYear(K.today.year, K.today.monthIndex).map((m) => {
      const ev = m.events.filter(keep);
      const by = (s) => ev.filter((e) => e.status === s).length;
      return {
        year: m.year, monthIndex: m.monthIndex, short: m.short, label: m.label,
        count: ev.length, paid: by('Paid'), declared: by('Declared'), estimated: by('Estimated')
      };
    });
    const stripMax = Math.max.apply(null, strip.map((m) => m.count).concat([1]));

    const days = raw.days.map((d) => Object.assign({}, d, { events: d.events.filter(keep) }));
    const cells = [];
    for (let i = 0; i < raw.leadingBlanks; i++) cells.push({ inMonth: false, bg: 'var(--canvas)', events: [] });
    days.forEach((d) => {
      const expanded = st.expand[year + '-' + mi + '-' + d.day];
      const cap = expanded ? d.events.length : 3;
      cells.push({
        inMonth: true, day: String(d.day),
        bg: d.isToday ? 'var(--accent-soft)' : 'var(--card)',
        dayBg: d.isToday ? 'var(--accent)' : 'transparent',
        dayColor: d.isToday ? 'var(--on-accent)' : d.events.length ? 'var(--t1)' : 'var(--t3)',
        dayWeight: d.events.length ? 600 : 400,
        hasTotal: d.events.length > 1 ? String(d.events.length) + ' ex' : '',
        total: d.events.length > 1 ? String(d.events.length) + ' ex' : '',
        events: d.events.slice(0, cap).map((e) => ({
          mono: e.mono, ticker: e.ticker,
          name: e.name.length > 15 ? e.name.slice(0, 14) + '…' : e.name,
          amount: money(e.perShare), yield: F.pct(e.yieldPct, 2),
          dot: STATUS[e.status].color,
          bg: e.held ? 'var(--accent-soft)' : 'var(--card)',
          border: e.held ? 'var(--accent-tint)' : 'var(--line)'
        })),
        more: d.events.length > cap ? '+' + (d.events.length - cap) + ' more' : (expanded && d.events.length > 3 ? 'show less' : ''),
        onMore: () => {
          const k = year + '-' + mi + '-' + d.day;
          const next = Object.assign({}, st.expand); next[k] = !next[k];
          this.setState({ expand: next });
        }
      });
    });
    while (cells.length % 7 !== 0) cells.push({ inMonth: false, bg: 'var(--canvas)', events: [] });

    const heldEvents = events.filter((e) => e.held).length;
    const monthlyEvents = events.filter((e) => e.frequency === 'Monthly').length;
    const avgYield = events.length ? events.reduce((s, e) => s + e.yieldPct, 0) / events.length : 0;
    const names = events.map((e) => e.ticker).filter((t, i, a) => a.indexOf(t) === i).length;
    const isCurrentMonth = st.offset === 0;
    const statusMix = ['Paid', 'Declared', 'Estimated']
      .map((s) => ({ s: s, n: events.filter((e) => e.status === s).length }))
      .filter((x) => x.n > 0);

    return Object.assign(base, {
      universeLabel: stats.count + '-name universe',
      headNote: 'Market-wide ex-dates · ' + stats.payers + ' payers across ' + stats.sectors
        + ' sectors · ' + stats.monthly + ' pay monthly · ' + stats.held
        + ' are in the portfolio · same three statuses as your own calendar',
      titleTip: st.titleTip,
      titleTipOn: () => this.setState({ titleTip: true }),
      titleTipOff: () => this.setState({ titleTip: false }),
      titleTipText: 'Every dividend in the screening universe, not just the ones you own — so the amounts are per share rather than per position. Turn on “my holdings only” and it behaves like Portfolio ▸ Dividend calendar, which shows what those payments are actually worth to you.',

      stats: [
        {
          label: 'Ex-dates', primary: String(events.length), tone: 'plain',
          secondary: names + (names === 1 ? ' name' : ' names'),
          note: monthlyEvents ? monthlyEvents + ' monthly' : '',
          tip: 'Ex-dates in this month after filters. A monthly payer appears every month; a quarterly payer four times a year.',
          border: 'none'
        },
        {
          label: 'Average yield', primary: events.length ? F.pct(avgYield, 2) : '—', tone: 'plain',
          secondary: events.length ? 'across the month' : 'nothing to average', note: '',
          tip: 'Mean forward yield of the names going ex this month — a read on what the month’s payers cost, not on income.',
          border: '1px solid var(--line)'
        },
        {
          label: 'In your portfolio', primary: String(heldEvents), tone: heldEvents ? 'pos' : 'plain',
          secondary: 'of ' + events.length + ' ex-dates', note: heldEvents ? 'shaded in the grid' : '',
          tip: 'Holdings you already own that go ex this month. Your own calendar prices these into dollars of income.',
          border: '1px solid var(--line)'
        },
        {
          label: 'Status', primary: statusMix.length ? statusMix[0].s : '—', tone: 'plain',
          secondary: statusMix.map((x) => x.n + ' ' + x.s.toLowerCase()).join(' · ') || 'no payments',
          note: '',
          tip: 'Paid is already through; Declared is the next month, where the issuer has announced the amount; anything later is Estimated from the current rate.',
          border: '1px solid var(--line)'
        }
      ],

      chartTitle: 'Ex-dates a month · ' + strip[0].short + ' – ' + strip[11].short,
      statusLegend: ['Paid', 'Declared', 'Estimated'].map((s) => ({ label: s, color: STATUS[s].color })),
      chartBars: strip.map((m, i) => {
        const isCur = m.year === year && m.monthIndex === mi;
        const hovered = st.hover === i;
        const segs = [
          { key: 'Estimated', v: m.estimated }, { key: 'Declared', v: m.declared }, { key: 'Paid', v: m.paid }
        ].filter((s) => s.v > 0);
        return {
          label: m.short, value: m.count ? String(m.count) : '',
          h: (m.count / stripMax * 100).toFixed(2) + '%',
          segments: segs.map((s) => ({
            h: (s.v / (m.count || 1) * 100).toFixed(2) + '%',
            color: STATUS[s.key].color
          })),
          slotBg: isCur ? 'var(--accent-soft)' : hovered ? 'var(--hover)' : 'transparent',
          labelColor: isCur ? 'var(--accent)' : 'var(--t2)',
          tickColor: isCur ? 'var(--t1)' : 'var(--t3)',
          onEnter: () => this.setState({ hover: i }),
          onLeave: () => this.setState({ hover: null }),
          onClick: () => this.setState({ offset: i, expand: {} })
        };
      }),
      chartNote: 'Click a month to open it below. Quarterly payers cluster in the third month of each quarter, which is why the strip is uneven.',

      monthLabel: raw.label,
      monthBack: () => this.setState({ offset: st.offset - 1, expand: {} }),
      monthFwd: () => this.setState({ offset: st.offset + 1, expand: {} }),
      goToday: () => this.setState({ offset: 0, expand: {} }),
      monthTotal: events.length + (events.length === 1 ? ' ex-date' : ' ex-dates'),
      monthNote: (isCurrentMonth ? 'this month' : raw.label) + ' · ' + names + ' names'
        + (heldEvents ? ' · ' + heldEvents + ' you hold' : '')
        + (filtered ? ' · ' + (raw.count - events.length) + ' filtered out' : ''),
      statusNote: 'Amounts are per share, before withholding tax',

      dropdowns: [
        {
          title: 'Sector', w: '184px', value: sector || 'All sectors',
          bg: sector ? 'var(--accent-soft)' : 'transparent',
          border: sector ? 'var(--accent)' : 'var(--line)',
          open: st.menu === 'sector',
          onToggle: (e) => { e.stopPropagation(); this.setState({ menu: st.menu === 'sector' ? null : 'sector' }); },
          options: [{ label: 'All sectors', value: null, meta: String(stats.count) }].concat(
            D.universeSectors().map((s) => ({ label: s.sector, value: s.sector, meta: String(s.count) }))
          ).map((o) => ({
            label: o.label, meta: o.meta,
            bg: (o.value || null) === sector ? 'var(--accent-soft)' : 'transparent',
            color: (o.value || null) === sector ? 'var(--accent)' : 'var(--t1)',
            weight: (o.value || null) === sector ? 600 : 400,
            onClick: (e) => { e.stopPropagation(); this.setState({ sector: o.value, menu: null }); }
          }))
        },
        {
          title: 'Frequency', w: '148px', value: freq || 'All',
          bg: freq ? 'var(--accent-soft)' : 'transparent',
          border: freq ? 'var(--accent)' : 'var(--line)',
          open: st.menu === 'freq',
          onToggle: (e) => { e.stopPropagation(); this.setState({ menu: st.menu === 'freq' ? null : 'freq' }); },
          options: [
            { label: 'All', value: null, meta: String(stats.payers) },
            { label: 'Monthly', value: 'Monthly', meta: String(stats.monthly) },
            { label: 'Quarterly', value: 'Quarterly', meta: String(stats.payers - stats.monthly) }
          ].map((o) => ({
            label: o.label, meta: o.meta,
            bg: (o.value || null) === freq ? 'var(--accent-soft)' : 'transparent',
            color: (o.value || null) === freq ? 'var(--accent)' : 'var(--t1)',
            weight: (o.value || null) === freq ? 600 : 400,
            onClick: (e) => { e.stopPropagation(); this.setState({ freq: o.value, menu: null }); }
          }))
        }
      ],
      minYield: minYieldDraft,
      yieldBorder: minY > 0 ? 'var(--accent)' : 'var(--line)',
      onMinYield: (e) => this.setState({ minYield: e.target.value.replace(/[^0-9.]/g, '') }),
      togMine: () => this.setState({ mine: !mine }),
      mineMark: mine ? '✓' : '',
      mineBg: mine ? 'var(--accent-soft)' : 'transparent',
      mineBorder: mine ? 'var(--accent)' : 'var(--line)',
      mineBoxBg: mine ? 'var(--accent)' : 'transparent',
      mineBoxBorder: mine ? 'var(--accent)' : 'var(--t3)',
      filtered: filtered,
      reset: () => this.setState({ sector: null, freq: null, minYield: '0', mine: false, query: '', menu: null }),
      query: st.query,
      onQuery: (e) => this.setState({ query: e.target.value }),

      views: ['Calendar', 'List'].map((v) => ({
        label: v,
        bg: view === v ? 'var(--accent-soft)' : 'transparent',
        color: view === v ? 'var(--accent)' : 'var(--t2)',
        weight: view === v ? 600 : 500,
        onClick: () => this.setState({ view: v })
      })),
      isCalendar: view === 'Calendar' && events.length > 0,
      isList: view === 'List' && events.length > 0,
      isEmpty: events.length === 0,
      emptyHint: filtered
        ? 'No name in the universe goes ex in ' + raw.label + ' under these filters — ' + raw.count + ' ex-dates were filtered out.'
        : 'Nothing goes ex this month, which only happens on an empty universe.',

      cells: cells,

      listHead: [
        { label: 'Ticker', justify: 'flex-start' },
        { label: 'Ex-date', justify: 'flex-start' },
        { label: 'Pay date', justify: 'flex-start' },
        { label: 'Amount / share', justify: 'flex-end' },
        { label: 'Yield', justify: 'flex-end' },
        { label: 'Frequency', justify: 'flex-start' },
        { label: 'Status', justify: 'flex-end' }
      ],
      listRows: events.slice().sort((a, b) => a.exDay - b.exDay || b.yieldPct - a.yieldPct).map((e) => ({
        mono: e.mono, ticker: e.ticker, name: e.name,
        badge: e.held ? 'HELD' : '',
        mark: e.held ? '2px solid var(--accent)' : '2px solid transparent',
        cells: [
          { text: e.exDate, justify: 'flex-start', weight: 500, color: 'var(--t1)' },
          { text: e.payDate, justify: 'flex-start', weight: 400, color: 'var(--t2)' },
          { text: money(e.perShare), justify: 'flex-end', weight: 600, color: 'var(--t1)' },
          { text: F.pct(e.yieldPct, 2), justify: 'flex-end', weight: 500, color: 'var(--t1)' },
          { text: e.frequency, justify: 'flex-start', weight: 400, color: 'var(--t2)' }
        ],
        status: e.status, statusBg: STATUS[e.status].bg, statusFg: STATUS[e.status].fg,
        bg: e.held ? 'var(--accent-soft)' : 'var(--card)'
      })),

      footnote: 'Market-wide, so every amount is per share: what the issuer pays on one share, before withholding tax. Portfolio ▸ Dividend calendar is the same grid over your ' + stats.held
        + ' holdings only, and prices each payment into dollars of income — switch on “my holdings only” here and the two agree name for name. Both screens read one dividend model and use the same three statuses: everything up to today is Paid, next month is Declared because the issuer has announced the amount, and later months are Estimated from the current rate. Ex-dates and pay dates for the names you own come from the same anchors your own calendar uses; for the rest of the universe they are the issuer’s usual pattern, clamped to the length of the month. A monthly payer shows twelve ex-dates a year and a quarterly payer four, which is why the strip above is uneven rather than flat.'
    });
  }
}
