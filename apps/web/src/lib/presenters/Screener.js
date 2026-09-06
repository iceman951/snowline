// @ts-nocheck
/** Presentation and chart geometry from Screener.dc.html; data comes from the core engine. */
import { Presenter } from "./presenter.svelte";
export default class ScreenerPresenter extends Presenter {
  state = {
    minYield: null, maxPayout: null, minStreak: null, sector: null, hideOwned: null,
    query: '', sort: null, dir: null, watch: null, watchOnly: false,
    limit: 25, titleTip: false, hover: null, menu: null, toast: ''
  };

  componentDidMount() {
    this.doc = () => { if (this.state.menu) this.setState({ menu: null }); };
    document.addEventListener('click', this.doc);
    /* /tools/screener#JNJ arrives from Find the Dip: search that name and
       drop the yield floor, so the linked ticker is actually in the result. */
    this.openHash = () => {
      const t = decodeURIComponent(String(window.location.hash || '').replace('#', '')).toUpperCase();
      if (t) this.setState({ query: t, minYield: '0', maxPayout: '100', minStreak: '0', sector: null, hideOwned: false, watchOnly: false, limit: 25 });
    };
    window.addEventListener('hashchange', this.openHash);
    setTimeout(this.openHash, 40);

  }
  componentWillUnmount() {
    if (this.doc) document.removeEventListener('click', this.doc);
    if (this.openHash) window.removeEventListener('hashchange', this.openHash);
  }

  num(v) { const n = parseFloat(String(v === null || v === undefined ? '' : v).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; }

  toast(msg) {
    this.setState({ toast: msg });
    if (this.tt) clearTimeout(this.tt);
    this.tt = setTimeout(() => this.setState({ toast: '' }), 2400);
  }

  /* the watchlist lives in the data module now, so Find the Dip sees the
     same stars */
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
      tabRows: [
        { label: 'Dashboard', d: I.home, href: '/', color: 'var(--t3)' },
        { label: 'Analytics', d: I.bars, href: '/analytics', color: 'var(--t3)' },
        { label: 'Portfolio', d: I.table, href: '/portfolio/holdings', color: 'var(--t3)' },
        { label: 'Tools', d: I.scale, href: '/tools/screener', color: 'var(--accent)' }
      ],
      stop: (e) => e.stopPropagation(),
      cols: '208px 92px 96px 100px 96px 100px 156px 108px 148px 44px'
    };
    if (!this.data) return base;

    const D = this.data, F = D.fmt;
    const money = (v) => F.money(v);
    const U = D.marketUniverse(), stats = D.universeStats();

    const minYield = st.minYield === null ? String(this.getProps().minYield === undefined ? 2 : this.getProps().minYield) : st.minYield;
    const maxPayout = st.maxPayout === null ? String(this.getProps().maxPayout === undefined ? 100 : this.getProps().maxPayout) : st.maxPayout;
    const minStreak = st.minStreak === null ? String(this.getProps().minStreak === undefined ? 0 : this.getProps().minStreak) : st.minStreak;
    const sector = st.sector === null ? (this.getProps().sector && this.getProps().sector !== 'All sectors' ? this.getProps().sector : null) : st.sector;
    const hideOwned = st.hideOwned === null ? this.getProps().hideOwned === true : st.hideOwned;
    const sort = st.sort || this.getProps().sortBy || 'Yield';
    const dir = st.dir === null ? -1 : st.dir;
    const q = st.query.trim().toLowerCase();

    const minY = this.num(minYield), maxP = this.num(maxPayout), minS = this.num(minStreak);
    const capLabel = (r) => (r.capB >= 1 ? '$' + F.num(r.capB, r.capB >= 100 ? 0 : 1) + 'bn' : '$' + F.num(r.capB * 1000, 0) + 'm');

    const matches = U.filter((r) => {
      if (r.yieldPct < minY) return false;
      /* an option-income structure has no payout ratio — a payout ceiling
         cannot exclude it, so it passes unless the ceiling is below 100 */
      if (r.payoutRatio === null) { if (maxP < 100) return false; }
      else if (r.payoutRatio > maxP) return false;
      if (r.streak < minS) return false;
      if (sector && r.sector !== sector) return false;
      if (hideOwned && r.held) return false;
      if (st.watchOnly && this.watch().indexOf(r.ticker) < 0) return false;
      if (!q) return true;
      return (r.ticker + ' ' + r.name + ' ' + r.sector).toLowerCase().indexOf(q) >= 0;
    });

    const key = {
      Ticker: (r) => r.ticker, Price: (r) => r.price, Yield: (r) => r.yieldPct,
      Payout: (r) => (r.payoutRatio === null ? -1 : r.payoutRatio),
      Streak: (r) => r.streak, Growth: (r) => (r.dividendGrowth5Y === null ? -99 : r.dividendGrowth5Y),
      Sector: (r) => r.sector, Size: (r) => r.capB,
      Safety: (r) => (r.rating.score === null ? -1 : r.rating.score)
    };
    const acc = key[sort] || key.Yield;
    const sorted = matches.slice().sort((a, b) => {
      const x = acc(a), y = acc(b);
      if (typeof x === 'string') return dir * x.localeCompare(y);
      return dir * (x - y);
    });
    const shown = sorted.slice(0, st.limit);

    const ys = matches.map((r) => r.yieldPct).sort((a, b) => a - b);
    const median = ys.length ? ys[Math.floor(ys.length / 2)] : 0;
    const scored = matches.filter((r) => r.rating.score !== null);
    const avgScore = scored.length ? Math.round(scored.reduce((s, r) => s + r.rating.score, 0) / scored.length) : 0;
    const scoreColor = (s) => s === null ? 'var(--t3)' : s >= 75 ? 'var(--accent)' : s >= 60 ? 'var(--t1)' : s >= 40 ? 'var(--t2)' : 'var(--tag-fg)';

    const filtered = minY !== 2 || maxP !== 100 || minS !== 0 || !!sector || hideOwned || !!q || st.watchOnly;
    const heldMatches = matches.filter((r) => r.held).length;

    const sortCol = (label, justify, sortable) => ({
      label: label, justify: justify,
      cursor: sortable === false ? 'default' : 'pointer',
      weight: sort === label ? 600 : 500,
      color: sort === label ? 'var(--t1)' : 'var(--t2)',
      arrow: sort === label ? (dir === -1 ? '▼' : '▲') : '',
      pos: 'static', z: 1,
      onClick: sortable === false ? (() => {}) : (() => this.setState({
        sort: label, dir: sort === label ? -dir : (label === 'Ticker' || label === 'Sector' ? 1 : -1), limit: 25
      }))
    });

    return Object.assign(base, {
      universeLabel: stats.count + ' names',
      headNote: stats.payers + ' payers across ' + stats.sectors + ' sectors · ' + stats.monthly
        + ' pay monthly · ' + stats.held + ' of them are in the portfolio · median yield ' + F.pct(stats.medianYield, 2),
      titleTip: st.titleTip,
      titleTipOn: () => this.setState({ titleTip: true }),
      titleTipOff: () => this.setState({ titleTip: false }),
      titleTipText: 'A screening universe, not a portfolio view: ' + stats.count + ' well-known payers, of which the '
        + stats.held + ' you hold carry exactly the numbers the rest of the app shows — same price, yield, payout ratio, growth and dividend rating. Yield is never entered; it is the annual dividend per share over the price, so this screen and the payout calendar cannot disagree.',

      stats: [
        {
          label: 'Universe', primary: String(stats.count), tone: 'plain',
          secondary: stats.sectors + ' sectors', note: stats.payers + ' pay a dividend',
          tip: 'An illustrative market list. The money-market line is excluded — it is not a market security.',
          border: 'none'
        },
        {
          label: 'Matches', primary: String(matches.length), tone: 'plain',
          secondary: 'of ' + stats.count + ' names',
          note: heldMatches ? heldMatches + ' held' : '',
          tip: 'How many names clear every filter at once.',
          border: '1px solid var(--line)'
        },
        {
          label: 'Median yield', primary: F.pct(median, 2), tone: 'plain',
          secondary: matches.length ? F.pct(ys[0], 2) + ' – ' + F.pct(ys[ys.length - 1], 2) : 'no matches',
          note: 'across the matches',
          tip: 'Median rather than mean: one 19% covered-call note would drag an average and tell you nothing about the middle of the list.',
          border: '1px solid var(--line)'
        },
        {
          label: 'Average safety', primary: avgScore ? String(avgScore) : '—', tone: avgScore >= 60 ? 'pos' : 'plain',
          secondary: scored.length + ' rated', note: 'same score as Analytics',
          tip: 'The dividend rating from Analytics ▸ Dividends, unchanged: payout headroom, five-year growth, structure, frequency and yield sustainability.',
          border: '1px solid var(--line)'
        }
      ],

      numFilters: [
        {
          label: 'Min yield', w: '104px', value: minYield, suffix: '%', prefix: '', placeholder: '0',
          border: this.num(minYield) !== 2 ? 'var(--accent)' : 'var(--line)',
          onChange: (e) => this.setState({ minYield: e.target.value.replace(/[^0-9.]/g, ''), limit: 25 })
        },
        {
          label: 'Max payout', w: '110px', value: maxPayout, suffix: '%', prefix: '', placeholder: '100',
          border: this.num(maxPayout) !== 100 ? 'var(--accent)' : 'var(--line)',
          onChange: (e) => this.setState({ maxPayout: e.target.value.replace(/[^0-9.]/g, ''), limit: 25 })
        },
        {
          label: 'Min streak', w: '112px', value: minStreak, suffix: 'yrs', prefix: '', placeholder: '0',
          border: this.num(minStreak) !== 0 ? 'var(--accent)' : 'var(--line)',
          onChange: (e) => this.setState({ minStreak: e.target.value.replace(/[^0-9.]/g, ''), limit: 25 })
        }
      ],

      sectorLabel: sector || 'All sectors',
      sectorBg: sector ? 'var(--accent-soft)' : 'transparent',
      sectorBorder: sector ? 'var(--accent)' : 'var(--line)',
      togSector: (e) => { e.stopPropagation(); this.setState({ menu: st.menu === 'sector' ? null : 'sector' }); },
      mSector: st.menu === 'sector',
      sectorOptions: [{ label: 'All sectors', value: null, count: stats.count }].concat(
        D.universeSectors().map((s) => ({ label: s.sector, value: s.sector, count: s.count }))
      ).map((o) => ({
        label: o.label, meta: String(o.count),
        bg: (o.value || null) === sector ? 'var(--accent-soft)' : 'transparent',
        color: (o.value || null) === sector ? 'var(--accent)' : 'var(--t1)',
        weight: (o.value || null) === sector ? 600 : 400,
        onClick: (e) => { e.stopPropagation(); this.setState({ sector: o.value, menu: null, limit: 25 }); }
      })),

      togHide: () => this.setState({ hideOwned: !hideOwned, limit: 25 }),
      hideMark: hideOwned ? '✓' : '',
      hideBg: hideOwned ? 'var(--accent-soft)' : 'transparent',
      hideBorder: hideOwned ? 'var(--accent)' : 'var(--line)',
      hideBoxBg: hideOwned ? 'var(--accent)' : 'transparent',
      hideBoxBorder: hideOwned ? 'var(--accent)' : 'var(--t3)',

      filtered: filtered,
      reset: () => this.setState({
        minYield: '2', maxPayout: '100', minStreak: '0', sector: null,
        hideOwned: false, query: '', watchOnly: false, limit: 25, menu: null
      }),
      query: st.query,
      onQuery: (e) => this.setState({ query: e.target.value, limit: 25 }),

      togWatchOnly: () => {
        if (!this.watch().length) return this.toast('Star a name to start a watchlist');
        this.setState({ watchOnly: !st.watchOnly, limit: 25 });
      },
      watchLabel: this.watch().length ? 'Watchlist · ' + this.watch().length : 'Watchlist',
      watchBg: st.watchOnly ? 'var(--accent-soft)' : 'transparent',
      watchBorder: st.watchOnly ? 'var(--accent)' : 'var(--line)',
      watchFg: st.watchOnly ? 'var(--accent)' : 'var(--t1)',
      watchFill: st.watchOnly ? 'var(--accent)' : 'none',

      resultLabel: matches.length === stats.count
        ? 'All ' + stats.count + ' names'
        : matches.length + (matches.length === 1 ? ' name' : ' names') + ' of ' + stats.count,
      sortLabel: 'sorted by ' + sort.toLowerCase() + (dir === -1 ? ', highest first' : ', lowest first'),
      badgeLegend: [
        { chip: 'HELD', label: 'in the portfolio', bg: 'var(--accent-soft)', fg: 'var(--accent)' },
        { chip: 'CLOSED', label: 'sold, still tracked', bg: 'var(--hover)', fg: 'var(--t2)' }
      ],

      head: [
        Object.assign(sortCol('Ticker', 'flex-start'), { pos: 'sticky', z: 3 }),
        sortCol('Price', 'flex-end'),
        sortCol('Yield', 'flex-end'),
        sortCol('Payout', 'flex-end'),
        sortCol('Streak', 'flex-end'),
        sortCol('Growth', 'flex-end'),
        sortCol('Sector', 'flex-start'),
        sortCol('Size', 'flex-end'),
        sortCol('Safety', 'flex-end'),
        Object.assign(sortCol('', 'center', false), { cursor: 'default' })
      ],

      rows: shown.map((r) => {
        const starred = this.watch().indexOf(r.ticker) >= 0;
        const cell = (text, sub, items, weight, color) => ({
          text: text, sub: sub || '', items: items || 'flex-end',
          weight: weight || 500, color: color || 'var(--t1)'
        });
        return {
          mono: r.mono, ticker: r.ticker, name: r.name,
          badge: r.held ? 'HELD' : r.closed ? 'CLOSED' : '',
          badgeBg: r.held ? 'var(--accent-soft)' : 'var(--hover)',
          badgeFg: r.held ? 'var(--accent)' : 'var(--t2)',
          mark: r.held ? '2px solid var(--accent)' : '2px solid transparent',
          cells: [
            cell(money(r.price), r.yieldPct ? money(r.dps) + ' a year' : 'no dividend'),
            cell(r.yieldPct ? F.pct(r.yieldPct, 2) : '—', r.yieldPct ? money(r.perPayment) + ' × ' + r.paymentsAYear : '', 'flex-end', 600),
            r.yieldPct === 0
              ? cell('—', 'no dividend', 'flex-end', 500, 'var(--t3)')
              : r.payoutRatio === null
                ? cell('—', 'option income', 'flex-end', 500, 'var(--t3)')
                : cell(F.pct(r.payoutRatio, 1), r.payoutRatio > 85 ? 'thin cover' : '', 'flex-end', 500, r.payoutRatio > 85 ? 'var(--tag-fg)' : 'var(--t1)'),
            r.streak > 0
              ? cell(String(r.streak) + ' yrs', r.streak >= 25 ? 'aristocrat' : '')
              : cell('—', r.yieldPct === 0 ? 'never paid' : r.isFund ? 'variable' : 'reset', 'flex-end', 500, 'var(--t3)'),
            r.dividendGrowth5Y === null
              ? cell('—', 'under 5 yrs', 'flex-end', 500, 'var(--t3)')
              : cell((r.dividendGrowth5Y >= 0 ? '+' : '−') + F.num(Math.abs(r.dividendGrowth5Y), 1) + '%', '5Y a year', 'flex-end', 500,
                r.dividendGrowth5Y < 0 ? 'var(--neg)' : 'var(--t1)'),
            cell(r.sector, r.assetClass === 'Stock' ? '' : r.assetClass, 'flex-start', 500, 'var(--t1)'),
            cell(capLabel(r), r.isFund ? 'fund AUM' : 'market cap')
          ],
          score: r.rating.score === null ? '—' : String(r.rating.score),
          scoreColor: scoreColor(r.rating.score),
          scoreLabel: r.rating.label,
          onStar: (e) => {
            e.stopPropagation();
            const next = starred ? this.watch().filter((t) => t !== r.ticker) : this.watch().concat([r.ticker]);
            this.data.saveWatchlist(next);
            this.setState({ watch: next, watchOnly: next.length ? st.watchOnly : false });
            this.toast(starred ? r.ticker + ' removed from the watchlist' : r.ticker + ' added to the watchlist');
          },
          starred: starred,
          starFill: starred ? 'var(--amber)' : 'none',
          starColor: starred ? 'var(--amber)' : 'var(--t3)',
          starTitle: starred ? 'Remove from watchlist' : 'Add to watchlist',
          bg: st.hover === r.ticker ? 'var(--hover)' : 'var(--card)',
          onEnter: () => this.setState({ hover: r.ticker }),
          onLeave: () => this.setState({ hover: null })
        };
      }),
      noResults: matches.length === 0,
      noResultsNote: st.watchOnly && !this.watch().length
        ? 'The watchlist is empty — star a name first.'
        : 'Nothing in the ' + stats.count + '-name universe clears a ' + F.pct(minY, 2) + ' yield'
          + (maxP < 100 ? ', a payout under ' + F.pct(maxP, 0) : '')
          + (minS > 0 ? ' and a ' + F.num(minS, 0) + '-year streak' : '') + '.',
      hasMore: sorted.length > shown.length,
      moreLabel: 'Show ' + Math.min(25, sorted.length - shown.length) + ' more of ' + sorted.length,
      showMore: () => this.setState({ limit: st.limit + 25 }),
      toast: st.toast,

      footnote: 'The universe is illustrative — ' + stats.count + ' well-known payers, not a live market feed — but it is internally consistent by construction. Yield is never entered: it is the annual dividend per share divided by the price, so this table and the payout calendar cannot disagree. A growth streak of zero always means the dividend was cut or the distribution is variable, which is why the covered-call funds and the mortgage REIT show a dash rather than a number, and a payout ratio is only absent for option-income structures — the one case the rating treats as having no cover to measure. The '
        + stats.held + ' names you hold are read from the portfolio rather than re-entered, so their price, yield, payout ratio, growth and safety score are the same figures the holdings table and Analytics ▸ Dividends show; the money-market line is excluded because it is not a market security, and '
        + stats.closed + ' past holdings stay in the list marked closed. Safety is the Analytics dividend rating, unchanged.'
    });
  }
}
