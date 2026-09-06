// @ts-nocheck
/** Presentation and chart geometry from FindTheDip.dc.html; data comes from the core engine. */
import { Presenter } from "./presenter.svelte";
export default class FindTheDipPresenter extends Presenter {
  state = {
    depth: null, scope: null, sector: null, below200: null, query: '',
    sort: 'off-high', dir: 1, limit: 25, menu: false, hover: null, titleTip: false, toast: '', watch: null
  };

  componentDidMount() {

    this.doc = () => { if (this.state.menu) this.setState({ menu: false }); };
    document.addEventListener('click', this.doc);
  }
  componentWillUnmount() {
    if (this.doc) document.removeEventListener('click', this.doc);
    if (this.t) clearTimeout(this.t);
  }

  toast(msg) {
    this.setState({ toast: msg });
    if (this.t) clearTimeout(this.t);
    this.t = setTimeout(() => this.setState({ toast: '' }), 2200);
  }

  watch() {
    return this.state.watch === null ? (this.data ? this.data.watchlist() : []) : this.state.watch;
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
        { label: 'Tools', d: I.scale, href: '/tools/find-the-dip', color: 'var(--accent)' }
      ],
      cols: 'minmax(240px,1.5fr) minmax(104px,0.72fr) minmax(150px,1fr) minmax(120px,0.8fr) minmax(120px,0.8fr) minmax(108px,0.72fr) minmax(160px,1fr) minmax(126px,0.82fr)'
    };
    if (!this.data) return base;

    const D = this.data, F = D.fmt, K = D.constants;
    const all = D.dipRows();
    const watch = this.watch();
    const inWatch = {};
    watch.forEach((t) => { inWatch[t] = true; });

    const depth = st.depth === null ? (this.getProps().minOffHigh || 'Any') : st.depth;
    const scope = st.scope === null ? (this.getProps().scope || 'All') : st.scope;
    const below200 = st.below200 === null ? this.getProps().below200Only === true : st.below200;
    const sector = st.sector;
    const q = st.query.trim().toLowerCase();
    const DEPTHS = { Any: 0, '5%+': 5, '10%+': 10, '20%+': 20 };
    const minOff = DEPTHS[depth] || 0;

    /* The universe this screen speaks about: what you hold, plus what you
       starred. "All" widens to the whole market list. */
    const scoped = all.filter((r) => {
      if (scope === 'Held') return r.held;
      if (scope === 'Watchlist') return !!inWatch[r.ticker];
      if (scope === 'Mine') return r.held || !!inWatch[r.ticker];
      return true;
    });
    const matches = scoped.filter((r) => {
      if (-r.tech.fromHigh < minOff - 0.0001) return false;
      if (below200 && r.tech.from200 >= 0) return false;
      if (sector && r.sector !== sector) return false;
      if (!q) return true;
      return (r.ticker + ' ' + r.name + ' ' + r.sector).toLowerCase().indexOf(q) >= 0;
    });

    const SORTS = {
      'Holding': (r) => r.ticker,
      'Price': (r) => r.price,
      'off-high': (r) => r.tech.fromHigh,
      '50-day': (r) => r.tech.from50,
      '200-day': (r) => r.tech.from200,
      'Yield': (r) => r.yieldPct,
      'Sector': (r) => r.sector,
      'Held': (r) => (r.held ? r.position.value : -1)
    };
    const pick = SORTS[st.sort] || SORTS['off-high'];
    const sorted = matches.slice().sort((a, b) => {
      const x = pick(a), y = pick(b);
      const c = typeof x === 'string' ? x.localeCompare(y) : x - y;
      return c * st.dir;
    });
    const shown = sorted.slice(0, st.limit);

    const dipped = scoped.filter((r) => r.tech.fromHigh <= -0.005);
    const below = scoped.filter((r) => r.tech.from200 < 0);
    const belowBoth = scoped.filter((r) => r.tech.from200 < 0 && r.tech.from50 < 0);
    const heldDown = scoped.filter((r) => r.held && r.tech.fromHigh <= -10);
    const offs = scoped.map((r) => -r.tech.fromHigh).sort((a, b) => a - b);
    const median = offs.length ? offs[Math.floor(offs.length / 2)] : 0;
    const deepest = scoped.slice().sort((a, b) => a.tech.fromHigh - b.tech.fromHigh)[0];
    const heldCount = all.filter((r) => r.held).length;
    const scopeWord = scope === 'Held' ? 'the ' + heldCount + ' names you hold'
      : scope === 'Watchlist' ? 'your ' + watch.length + '-name watchlist'
        : scope === 'Mine' ? 'your holdings and watchlist' : 'the ' + all.length + '-name universe';

    const head = [
      { label: 'Holding', key: 'Holding', justify: 'flex-start' },
      { label: 'Price', key: 'Price', justify: 'flex-end' },
      { label: 'From 52-week high', key: 'off-high', justify: 'flex-end' },
      { label: 'From 50-day', key: '50-day', justify: 'flex-end' },
      { label: 'From 200-day', key: '200-day', justify: 'flex-end' },
      { label: 'Yield', key: 'Yield', justify: 'flex-end' },
      { label: 'Sector', key: 'Sector', justify: 'flex-start' },
      { label: 'Held', key: 'Held', justify: 'flex-end' }
    ].map((h) => ({
      label: h.label, justify: h.justify, cursor: 'pointer', hoverBg: 'var(--hover)',
      pos: h.key === 'Holding' ? 'sticky' : 'static', z: h.key === 'Holding' ? 2 : 1,
      weight: st.sort === h.key ? 600 : 500,
      color: st.sort === h.key ? 'var(--t1)' : 'var(--t2)',
      arrow: st.sort === h.key ? (st.dir === -1 ? '▼' : '▲') : '',
      onClick: () => this.setState({
        sort: h.key,
        dir: st.sort === h.key ? -st.dir : (h.key === 'off-high' || h.key === 'Holding' || h.key === 'Sector' || h.key === '50-day' || h.key === '200-day' ? 1 : -1),
        limit: 25
      })
    }));

    const seg = (opts, cur, set) => opts.map((o, i) => ({
      label: o, divider: i ? '1px solid var(--line)' : 'none',
      bg: cur === o ? 'var(--accent-soft)' : 'transparent',
      color: cur === o ? 'var(--accent)' : 'var(--t1)',
      weight: cur === o ? 600 : 500,
      onClick: () => set(o)
    }));

    const sectors = {};
    scoped.forEach((r) => { sectors[r.sector] = (sectors[r.sector] || 0) + 1; });

    return Object.assign(base, {
      portfolioName: K.portfolioName,
      headNote: 'Prices to ' + K.today.label + ' · ' + dipped.length + ' of ' + scoped.length + ' names in ' + scopeWord
        + ' are off their 52-week high, ' + below.length + ' below the 200-day'
        + (deepest ? ' · deepest is ' + deepest.ticker + ' at ' + F.pct(deepest.tech.fromHigh, 2) : ''),
      titleTip: st.titleTip,
      tipOn: () => this.setState({ titleTip: true }),
      tipOff: () => this.setState({ titleTip: false }),
      titleTipText: 'A dip is not a reason to buy. Everything here is a distance — price against its own 52-week extremes and its own 50- and 200-session averages — computed from one generated price path per ticker that ends exactly at the price the rest of the app shows. Nothing on this screen forecasts a recovery, and a name can be 30% off its high because the business changed.',

      stats: [
        {
          label: 'Off their high', primary: String(dipped.length) + ' of ' + scoped.length,
          tone: 'plain', secondary: 'median ' + F.pct(median, 2) + ' below', note: scopeWord,
          tip: 'Names trading under their own 52-week high, within the scope selected above. The median is the middle distance, not an average — a few deep names cannot drag it.',
          border: 'none'
        },
        {
          label: 'Below the 200-day', primary: String(below.length),
          tone: below.length ? 'neg' : 'plain',
          secondary: belowBoth.length + ' below both averages', note: 'of ' + scoped.length + ' names',
          tip: 'Price under the 200-session average — the slower of the two. Below both usually means the shorter average has crossed under the longer one.',
          border: '1px solid var(--line)'
        },
        {
          label: 'Held names down 10%+', primary: String(heldDown.length),
          tone: heldDown.length ? 'neg' : 'plain',
          secondary: heldDown.length ? heldDown.map((r) => r.ticker).slice(0, 4).join(', ') : 'none that far off',
          note: 'from their 52-week high',
          tip: 'Positions you already own that sit 10% or more below their 52-week high — the ones where adding would lower your average cost, if the reason for holding still stands.',
          border: '1px solid var(--line)'
        },
        {
          label: 'Watchlist', primary: String(watch.length),
          tone: 'plain',
          secondary: watch.length ? watch.slice(0, 5).join(', ') : 'nothing starred yet',
          note: 'shared with the screener',
          tip: 'Starred names, kept in step with Tools ▸ Top dividend stocks — star here and it is starred there.',
          border: '1px solid var(--line)'
        }
      ],

      depthTabs: seg(['Any', '5%+', '10%+', '20%+'], depth, (o) => this.setState({ depth: o, limit: 25 })),
      scopeTabs: seg(['All', 'Mine', 'Held', 'Watchlist'], scope, (o) => this.setState({ scope: o, limit: 25 })),
      togSector: (e) => { e.stopPropagation(); this.setState({ menu: !st.menu }); },
      sectorOpen: st.menu,
      sectorLabel: sector || 'All sectors',
      sectorBorder: st.menu || sector ? 'var(--accent)' : 'var(--line)',
      sectorOptions: [{ label: 'All sectors', value: null, count: scoped.length }]
        .concat(Object.keys(sectors).sort().map((s) => ({ label: s, value: s, count: sectors[s] })))
        .map((o) => ({
          label: o.label, count: o.count,
          bg: sector === o.value ? 'var(--accent-soft)' : 'transparent',
          color: sector === o.value ? 'var(--accent)' : 'var(--t1)',
          weight: sector === o.value ? 600 : 400,
          onClick: (e) => { e.stopPropagation(); this.setState({ sector: o.value, menu: false, limit: 25 }); }
        })),
      togBelow200: () => this.setState({ below200: !below200, limit: 25 }),
      belowMark: below200 ? '✓' : '',
      belowBg: below200 ? 'var(--accent-soft)' : 'transparent',
      belowBorder: below200 ? 'var(--accent)' : 'var(--line)',
      belowBoxBg: below200 ? 'var(--accent)' : 'transparent',
      belowBoxBorder: below200 ? 'var(--accent)' : 'var(--t3)',
      query: st.query,
      onQuery: (e) => this.setState({ query: e.target.value, limit: 25 }),
      filtered: depth !== 'Any' || scope !== 'All' || !!sector || below200 || !!q,
      onReset: () => this.setState({ depth: 'Any', scope: 'All', sector: null, below200: false, query: '', limit: 25 }),
      resultLabel: matches.length === scoped.length
        ? scoped.length + ' names'
        : matches.length + ' of ' + scoped.length + ' names',

      showRange: this.getProps().showRangeBar !== false,
      head: head,
      rows: shown.map((r) => {
        const t = r.tech, starred = !!inWatch[r.ticker];
        return {
          mono: r.mono, ticker: r.ticker, name: r.name,
          /* both destinations pick the ticker up from the hash */
          href: (r.held ? '/portfolio/holdings#' : '/tools/screener#') + r.ticker,
          hrefTitle: r.held ? 'Open the ' + r.ticker + ' position' : 'See ' + r.ticker + ' on the screener',
          /* same marking the screener uses: a filled HELD badge and a thin
             accent rule down the frozen column */
          tag: r.held ? 'HELD' : starred ? 'WATCHING' : '',
          tagBg: r.held ? 'var(--accent-soft)' : 'var(--tag-bg)',
          tagFg: r.held ? 'var(--accent)' : 'var(--tag-fg)',
          mark: r.held ? '2px solid var(--accent)' : '2px solid transparent',
          price: F.money(r.price),
          /* a day change exists only for what you hold — everything else gets
             its place in the 52-week range instead of a fabricated 0.00% */
          priceSub: r.held
            ? F.caret(r.position.dayChangePct, 2) + ' today'
            : F.num(t.rangePos, 0) + '% of 52w range',
          priceTone: r.held ? (r.position.dayChangePct >= 0 ? 'pos' : 'neg') : 'plain',

          fromHigh: F.caret(t.fromHigh, 2),
          highSub: F.money(t.high) + ' high · ' + t.highDate,
          highTone: t.fromHigh <= -10 ? 'neg' : 'plain',
          rangePos: Math.max(0, Math.min(100, t.rangePos)).toFixed(1) + '%',
          rangeColor: t.fromHigh <= -10 ? 'var(--neg)' : 'var(--grey-series)',

          from50: F.caret(t.from50, 2),
          ma50: F.money(t.ma50) + ' avg',
          tone50: t.from50 >= 0 ? 'pos' : 'neg',
          from200: F.caret(t.from200, 2),
          ma200: F.money(t.ma200) + ' avg',
          tone200: t.from200 >= 0 ? 'pos' : 'neg',

          yield: r.yieldPct ? F.pct(r.yieldPct, 2) : '—',
          yieldSub: r.yieldPct ? F.money(r.dps) + ' · ' + r.frequency.toLowerCase() : 'no dividend',
          sector: r.sector,
          sectorSub: r.assetClass + (t.trendUp ? ' · 50d above 200d' : ' · 50d below 200d'),
          held: r.held ? F.money(r.position.value) : starred ? 'Watchlist' : '—',
          heldSub: r.held ? F.shares(r.position.shares) + ' shares' : starred ? 'not held' : 'not held',
          heldTone: 'plain',

          bg: st.hover === r.ticker ? 'var(--hover)' : 'var(--card)',
          onEnter: () => this.setState({ hover: r.ticker }),
          onLeave: () => this.setState({ hover: null }),
          starred: starred,
          starFill: starred ? 'var(--amber)' : 'none',
          starColor: starred ? 'var(--amber)' : 'var(--t3)',
          starTitle: starred ? 'Remove from watchlist' : 'Add to watchlist',
          onStar: (e) => {
            e.preventDefault();
            e.stopPropagation();
            const next = D.toggleWatch(r.ticker);
            this.setState({ watch: next });
            this.toast(starred ? r.ticker + ' removed from the watchlist' : r.ticker + ' added to the watchlist');
          }
        };
      }),
      noResults: matches.length === 0,
      noResultsNote: scope === 'Watchlist' && !watch.length
        ? 'The watchlist is empty — star a name here or on the screener.'
        : 'Nothing in ' + scopeWord + (sector ? ', ' + sector + ',' : '') + ' is '
          + (minOff ? 'at least ' + F.pct(minOff, 0) + ' below its 52-week high' : 'below its 52-week high')
          + (below200 ? ' and under its 200-day average' : '') + '. Widen the filters to see more.',
      hasMore: sorted.length > shown.length,
      moreLabel: 'Show ' + Math.min(25, sorted.length - shown.length) + ' more of ' + sorted.length,
      onMore: () => this.setState({ limit: st.limit + 25 }),
      toast: st.toast,

      footnote: 'How these are computed: each ticker has one generated price path of ' + D.technicals(all[0]).sessions
        + ' sessions — about a trading year — and the 52-week high and low are that path’s extremes, while the 50-day and 200-day '
        + 'figures are the plain mean of its last 50 and 200 sessions. The path is scaled by a single constant so its final session equals '
        + 'the price shown everywhere else in the app, which leaves every ratio inside it intact: that is why a name near its high is never '
        + 'also reported far below its 200-day. Its drift is pinned to one published annual figure per name — the position’s IRR where you hold it, '
        + 'yield plus 5-year dividend growth where you do not — and the session-to-session dispersion is synthetic, scaled by asset class, with the '
        + 'T-bill ETF held nearly flat. So treat the distances as the shape of a plausible year, not a market record: '
        + 'there is no intraday data, no split-adjusted vendor history, and no forecast of a bounce. Prices are as of ' + K.today.label
        + ' and dividends are gross of the ' + F.pct(K.withholdingTax * 100, 0) + ' withholding applied elsewhere. '
        + 'A day change is shown only for positions you hold, where the app has one; every other name shows where its price sits inside its 52-week range instead.'
    });
  }
}
