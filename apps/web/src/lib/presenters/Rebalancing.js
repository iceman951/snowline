// @ts-nocheck
/** Presentation and chart geometry from Rebalancing.dc.html; data comes from the core engine. */
import { Presenter } from "./presenter.svelte";
export default class RebalancingPresenter extends Presenter {
  state = {
    mode: null, cash: null, min: null, whole: null, surplus: null,
    titleTip: false, hover: null, side: 'All'
  };

  componentDidMount() {

  }

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
        { label: 'Tools', d: I.scale, href: '/tools/rebalancing', color: 'var(--accent)' }
      ],
      stop: (e) => e.stopPropagation(),
      catCols: 'minmax(140px,1.05fr) minmax(210px,1.75fr) 88px minmax(120px,0.95fr) minmax(104px,0.8fr)',
      legCols: 'minmax(170px,1.1fr) minmax(120px,0.85fr) minmax(104px,0.75fr) 92px minmax(126px,0.9fr) minmax(112px,0.8fr) minmax(120px,0.9fr)'
    };
    if (!this.data) return base;

    const D = this.data, F = D.fmt, K = D.constants, T = D.totals();
    const money = (v) => F.money(v);
    const pp = (v, d) => (v >= 0 ? '+' : '−') + F.num(Math.abs(v), d === undefined ? 2 : d) + 'pp';

    const mode = st.mode || (this.getProps().startMode === 'New cash only' ? 'cash' : 'now');
    const isCash = mode === 'cash';
    const cashDraft = st.cash === null ? String(this.getProps().newCash === undefined ? 1000 : this.getProps().newCash) : st.cash;
    const minDraft = st.min === null ? String(this.getProps().minTrade === undefined ? 50 : this.getProps().minTrade) : st.min;
    const whole = st.whole === null ? this.getProps().wholeShares === true : st.whole;
    const useSurplus = st.surplus === null ? this.getProps().useCashSurplus === true : st.surplus;
    const newCash = isCash ? this.num(cashDraft) : 0;
    const minTrade = this.num(minDraft);

    const { cats, isCashCat, float, cashCat, surplus, V, V2, action, buyTotal, surplusUsed, parked, theta, legs, dropped, residual, execBuys, execSells, after, afterTotal, afterWeight, afterDrift, driftBefore, driftAfter, closedPct, worstBefore, worstAfter, cashName } = D.rebalance({ isCash, newCash, minTrade, whole, useSurplus });

    /* ---- bars: one scale for every row ----------------------------------- */
    const maxW = Math.max.apply(null, cats.map((c) => Math.max(c.allocN, c.targetN)));
    const scale = Math.max(10, Math.ceil(maxW / 10) * 10);
    const pos = (v) => Math.max(0, Math.min(100, v / scale * 100)).toFixed(2) + '%';

    const cashAfter = cashName ? after[cashName] : 0;

    /* ---- flags ----------------------------------------------------------- */
    const flags = [];
    if (!isCash && surplus > 0 && useSurplus) {
      flags.push({
        tone: 'var(--amber)', title: 'This dips into the cash float',
        body: 'The money-market line is ' + money(float) + ' and the cash bucket’s ' + F.pct(cashCat.targetN, 2) + ' target values it at '
          + money(cashCat.targetValue) + '. Spending the ' + money(surplus) + ' above target takes the balance to ' + money(cashAfter)
          + ' — below the float the cash screen maintains, which tops up before a purchase would breach it.'
      });
    } else if (!isCash && surplus > 0) {
      flags.push({
        tone: 'var(--line)', title: money(surplus) + ' of cash sits above target, unused',
        body: 'The balance is exactly at the ' + money(float) + ' float, so nothing is free to spend without breaching it. Buys are funded from sales only. Turn on “spend the surplus” to deploy it anyway.'
      });
    }
    if (cashCat) {
      flags.push({
        tone: 'var(--line)', title: cashCat.tickers.join(', ') + ' is not traded here',
        body: 'The ' + cashCat.name.toLowerCase() + ' bucket is the money-market line — a manually priced fund with no market feed. It funds and absorbs the plan instead of appearing as a trade, so it never shows up in the trade list.'
      });
    }
    const blocked = legs.filter((l) => l.blocked);
    if (blocked.length) {
      flags.push({
        tone: 'var(--amber)', title: blocked.length + (blocked.length === 1 ? ' leg cannot buy a whole share' : ' legs cannot buy a whole share'),
        body: blocked.map((l) => l.p.ticker + ' needs ' + money(l.price) + ' for one share against ' + money(Math.abs(l.planned)) + ' allocated').join('; ')
          + '. Turn off whole shares, or let these buckets drift until the allocation is big enough.'
      });
    }
    const frac = legs.filter((l) => l.fractional);
    if (frac.length) {
      flags.push({
        tone: 'var(--line)', title: frac.length + (frac.length === 1 ? ' leg needs fractional shares' : ' legs need fractional shares'),
        body: frac.map((l) => l.p.ticker + ' ' + F.num(l.rawShares, 4) + ' sh').join(', ')
          + '. Fine at brokers that support fractions; otherwise switch on whole shares and re-read the plan.'
      });
    }
    if (dropped.length) {
      const rolled = dropped.filter((d) => d.why === 'rolled');
      const cut = dropped.filter((d) => d.why !== 'rolled');
      if (rolled.length) {
        flags.push({
          tone: 'var(--line)', title: rolled.length + (rolled.length === 1 ? ' leg was below ' : ' legs were below ') + money(minTrade),
          body: rolled.map((d) => d.scope + ' ' + money(Math.abs(d.amount)) + ' → ' + d.into).join(', ')
            + '. The bucket total is unchanged: small legs roll into the largest line in the same bucket rather than being dropped.'
        });
      }
      if (cut.length) {
        flags.push({
          tone: 'var(--line)', title: cut.length + (cut.length === 1 ? ' bucket left alone' : ' buckets left alone'),
          body: cut.map((d) => d.scope + ' ' + money(Math.abs(d.amount))).join(', ') + ' — under the ' + money(minTrade) + ' minimum for the whole bucket, so no trade is suggested.'
        });
      }
    }
    if (whole && residual > 0.5) {
      flags.push({
        tone: 'var(--line)', title: money(residual) + ' unallocated by rounding',
        body: 'Whole-share rounding always floors, so each leg trades a little less than planned. The after-weights in both tables reflect what actually executes, not the planned amount.'
      });
    }

    const sideFilter = st.side;
    const shownLegs = legs.filter((l) => sideFilter === 'All' || (sideFilter === 'Buys' ? l.sign > 0 : l.sign < 0))
      .slice().sort((a, b) => (a.sign === b.sign ? Math.abs(b.exec) - Math.abs(a.exec) : a.sign - b.sign));

    return Object.assign(base, {
      portfolioName: K.portfolioName,
      headNote: (isCash
        ? money(newCash) + ' of new cash · buy-only · '
        : money(execSells) + ' to raise, ' + money(execBuys) + ' to deploy · ')
        + legs.length + (legs.length === 1 ? ' trade' : ' trades') + ' · targets owned by Categories, drift '
        + F.num(driftBefore, 2) + 'pp → ' + F.num(driftAfter, 2) + 'pp',
      titleTip: st.titleTip,
      titleTipOn: () => this.setState({ titleTip: true }),
      titleTipOff: () => this.setState({ titleTip: false }),
      titleTipText: 'This screen suggests trades, it does not own targets. Every target weight, bucket and holding assignment is read live from the Categories model — edit a target there and the suggestions here change with it. Nothing is executed: the plan is arithmetic on today’s prices.',

      modes: [
        { label: 'Rebalance now', value: 'now' },
        { label: 'New cash only', value: 'cash' }
      ].map((m) => ({
        label: m.label,
        bg: mode === m.value ? 'var(--accent-soft)' : 'transparent',
        color: mode === m.value ? 'var(--accent)' : 'var(--t2)',
        weight: mode === m.value ? 600 : 500,
        onClick: () => this.setState({ mode: m.value, side: 'All' })
      })),
      isCash: isCash, isNow: !isCash,
      cashDraft: cashDraft,
      onCash: (e) => this.setState({ cash: e.target.value.replace(/[^0-9.]/g, '') }),
      cashPresets: [500, 1000, 2500, 5000].map((v) => ({
        label: '$' + F.num(v, 0),
        bg: this.num(cashDraft) === v ? 'var(--accent-soft)' : 'transparent',
        border: this.num(cashDraft) === v ? 'var(--accent)' : 'var(--line)',
        color: this.num(cashDraft) === v ? 'var(--accent)' : 'var(--t2)',
        onClick: () => this.setState({ cash: String(v) })
      })),
      minDraft: minDraft,
      onMin: (e) => this.setState({ min: e.target.value.replace(/[^0-9.]/g, '') }),
      togWhole: () => this.setState({ whole: !whole }),
      wholeMark: whole ? '✓' : '',
      wholeBg: whole ? 'var(--accent-soft)' : 'transparent',
      wholeBorder: whole ? 'var(--accent)' : 'var(--line)',
      wholeBoxBg: whole ? 'var(--accent)' : 'transparent',
      wholeBoxBorder: whole ? 'var(--accent)' : 'var(--t3)',
      togSurplus: () => this.setState({ surplus: !useSurplus }),
      surplusLabel: 'Spend the ' + money(surplus) + ' above the cash target',
      surplusMark: useSurplus ? '✓' : '',
      surplusBg: useSurplus ? 'var(--tag-bg)' : 'transparent',
      surplusBorder: useSurplus ? 'var(--amber)' : 'var(--line)',
      surplusBoxBg: useSurplus ? 'var(--amber)' : 'transparent',
      surplusBoxBorder: useSurplus ? 'var(--amber)' : 'var(--t3)',

      stats: isCash
        ? [
          {
            label: 'Cash to invest', primary: money(newCash), tone: 'plain',
            secondary: money(execBuys) + ' allocated', note: parked > 0.5 ? money(parked) + ' stays in cash' : '',
            tip: 'New money only. Nothing is sold in this mode, so no bucket that is already overweight is touched.',
            border: 'none'
          },
          {
            label: 'Buys', primary: String(legs.length), tone: 'plain',
            secondary: legs.length ? legs.map((l) => l.p.ticker).slice(0, 4).join(', ') + (legs.length > 4 ? ' +' + (legs.length - 4) : '') : 'none',
            note: '', tip: 'One leg per holding, apportioned inside each bucket by current value.',
            border: '1px solid var(--line)'
          },
          {
            label: 'Cash after', primary: money(cashAfter), tone: cashAfter + 0.005 < float ? 'neg' : 'plain',
            secondary: money(float) + ' float', note: cashAfter + 0.005 < float ? 'below the float' : 'float intact',
            tip: 'New cash lands in the money-market line and leaves it as the buys settle. The float is the balance the cash screen refuses to go below.',
            border: '1px solid var(--line)'
          },
          {
            label: 'Toward target', primary: F.num(closedPct, 0) + '%', tone: 'pos',
            secondary: F.num(driftBefore, 2) + 'pp → ' + F.num(driftAfter, 2) + 'pp',
            note: 'total absolute drift',
            tip: 'Total absolute drift across all buckets, before and after. Buy-only money can never close it fully while a bucket is overweight — that needs a sale.',
            border: '1px solid var(--line)'
          }
        ]
        : [
          {
            label: 'To buy', primary: money(execBuys), tone: 'plain',
            secondary: legs.filter((l) => l.sign > 0).length + ' legs',
            note: execBuys + 0.5 < buyTotal ? money(buyTotal - execBuys) + ' short of plan' : '',
            tip: 'Buys are capped by what the sales raise, plus the cash surplus if you choose to spend it. Under-target buckets are funded pro-rata when there is not enough.',
            border: 'none'
          },
          {
            label: 'To sell', primary: money(execSells), tone: 'plain',
            secondary: legs.filter((l) => l.sign < 0).length + ' legs', note: 'from over-target buckets',
            tip: 'Every over-target bucket is sold back to its target weight. That is what funds the buys.',
            border: '1px solid var(--line)'
          },
          {
            label: 'Trades', primary: String(legs.filter((l) => !l.blocked).length), tone: 'plain',
            secondary: 'min ' + money(minTrade) + ' a leg',
            note: (whole ? 'whole shares' : 'fractions allowed') + (blocked.length ? ' · ' + blocked.length + ' blocked' : ''),
            tip: 'Legs below the minimum roll into the largest line in the same bucket, so the bucket total is preserved and the trade count stays sane.',
            border: '1px solid var(--line)'
          },
          {
            label: 'Toward target', primary: F.num(closedPct, 0) + '%', tone: 'pos',
            secondary: F.num(driftBefore, 2) + 'pp → ' + F.num(driftAfter, 2) + 'pp',
            note: 'total absolute drift',
            tip: 'Sum of every bucket’s absolute drift, before and after the plan. 100% would mean every bucket sits exactly on target.',
            border: '1px solid var(--line)'
          }
        ],

      legend: [
        { label: 'current', bg: 'var(--grey-series)', border: 'none' },
        { label: 'to buy', bg: 'var(--accent)', border: 'none' },
        { label: 'to sell', bg: 'repeating-linear-gradient(135deg, var(--grey-series) 0 3px, transparent 3px 6px)', border: '1px solid var(--line)' },
        { label: 'target', bg: 'var(--t1)', border: 'none' }
      ],
      catHead: [
        { label: 'Category', justify: 'flex-start' },
        { label: 'Weight against target', justify: 'flex-start' },
        { label: 'Drift', justify: 'flex-end' },
        { label: 'Action', justify: 'flex-end' },
        { label: 'After', justify: 'flex-end' }
      ],
      catRows: cats.map((c) => {
        const a = action[c.name] || 0;
        const cashRow = isCashCat(c.name);
        const buy = a > 0.005, sell = a < -0.005;
        const lo = Math.min(c.allocN, c.targetN), hi = Math.max(c.allocN, c.targetN);
        const under = c.allocN < c.targetN;
        return {
          name: c.name,
          sub: c.count + (c.count === 1 ? ' holding · ' : ' holdings · ') + money(c.value),
          baseW: pos(Math.min(c.allocN, c.targetN)),
          segL: pos(lo), segW: (Math.max(0, Math.min(100, (hi - lo) / scale * 100))).toFixed(2) + '%',
          segBg: under ? 'var(--accent)' : 'repeating-linear-gradient(135deg, var(--grey-series) 0 3px, transparent 3px 6px)',
          tickX: pos(c.targetN),
          weightLine: F.pct(c.allocN, 2) + ' now · target ' + F.pct(c.targetN, 2),
          drift: pp(c.driftN), driftColor: Math.abs(c.driftN) <= 1 ? 'var(--t2)' : 'var(--t1)',
          action: cashRow
            ? (Math.abs(a) > 0.005 ? 'Spend ' + money(Math.abs(a)) : isCash ? (parked > 0.5 ? 'Keep ' + money(parked) : 'No change') : 'Hold')
            : buy ? 'Buy ' + money(a) : sell ? 'Sell ' + money(-a) : 'No trade',
          actionSub: cashRow
            ? (Math.abs(a) > 0.005 ? 'from the money-market line' : isCash ? 'new cash resting here' : money(surplus) + ' above target, held')
            : buy || sell
              ? (c.count === 1 ? '1 leg' : legs.filter((l) => l.category === c.name).length + ' of ' + c.count + ' legs')
              : (isCash ? 'already at or above target' : 'on target'),
          actionTone: !cashRow && buy ? 'pos' : 'plain',
          after: F.pct(afterWeight(c.name), 2),
          afterSub: pp(afterDrift(c)) + ' off',
          afterTone: Math.abs(afterDrift(c)) <= 0.5 ? 'pos' : 'plain',
          bg: st.hover === c.name ? 'var(--hover)' : 'transparent',
          flagBorder: cashRow ? '2px solid var(--amber)' : '2px solid transparent',
          onEnter: () => this.setState({ hover: c.name }),
          onLeave: () => this.setState({ hover: null })
        };
      }),
      catTotalSub: cats.length + ' buckets · ' + money(V) + (isCash ? ' + ' + money(newCash) + ' new' : ''),
      catTotalNote: 'bars scaled to ' + F.pct(scale, 0) + ' · target weights read from Categories',
      driftTotal: F.num(driftBefore, 2) + 'pp',
      actionTotal: isCash ? money(execBuys) + ' in' : money(execBuys) + ' / ' + money(execSells),
      actionTotalSub: isCash ? 'nothing sold' : 'bought / sold',
      driftAfterTotal: F.num(driftAfter, 2) + 'pp',
      driftAfterSub: F.num(closedPct, 0) + '% closed',

      fundTitle: isCash ? 'Where the cash goes' : 'Funding the plan',
      fundNote: isCash ? money(newCash) + ' deposit' : money(execSells + surplusUsed) + ' available',
      fundBar: isCash
        ? [
          { w: (newCash ? execBuys / newCash * 100 : 0).toFixed(2) + '%', bg: 'var(--accent)' },
          { w: (newCash ? parked / newCash * 100 : 0).toFixed(2) + '%', bg: 'var(--track)' }
        ]
        : [
          { w: (execSells + surplusUsed ? execSells / (execSells + surplusUsed) * 100 : 0).toFixed(2) + '%', bg: 'var(--grey-series)' },
          { w: (execSells + surplusUsed ? surplusUsed / (execSells + surplusUsed) * 100 : 0).toFixed(2) + '%', bg: 'var(--amber)' }
        ],
      fundRows: isCash
        ? [
          { label: 'Into the market', value: money(execBuys), dot: 'var(--accent)', dotOpacity: 1, color: 'var(--t1)', weight: 500, pad: '0px', border: 'none' },
          { label: 'Left in the float', value: money(parked), dot: 'var(--track)', dotOpacity: 1, color: 'var(--t2)', weight: 400, pad: '0px', border: 'none' },
          { label: 'Nothing sold', value: money(0), dot: 'var(--line)', dotOpacity: 1, color: 'var(--t3)', weight: 400, pad: '0px', border: 'none' },
          { label: 'Cash line after', value: money(cashAfter), dot: 'var(--t3)', dotOpacity: 0, color: 'var(--t1)', weight: 600, pad: '11px', border: '1px solid var(--line)' }
        ]
        : [
          { label: 'Sales proceeds', value: money(execSells), dot: 'var(--grey-series)', dotOpacity: 1, color: 'var(--t1)', weight: 500, pad: '0px', border: 'none' },
          { label: 'Cash surplus used', value: money(surplusUsed), dot: 'var(--amber)', dotOpacity: 1, color: surplusUsed > 0 ? 'var(--amber)' : 'var(--t3)', weight: 400, pad: '0px', border: 'none' },
          { label: 'Deployed into buys', value: money(execBuys), dot: 'var(--accent)', dotOpacity: 1, color: 'var(--t1)', weight: 500, pad: '0px', border: 'none' },
          { label: 'Cash line after', value: money(cashAfter), dot: 'var(--t3)', dotOpacity: 0, color: cashAfter + 0.005 < float ? 'var(--amber)' : 'var(--t1)', weight: 600, pad: '11px', border: '1px solid var(--line)' }
        ],
      driftPath: F.num(driftBefore, 2) + 'pp → ' + F.num(driftAfter, 2) + 'pp',
      closedW: Math.max(0, Math.min(100, closedPct)).toFixed(1) + '%',
      closedNote: 'Worst bucket ' + worstBefore.name + ' ' + pp(worstBefore.driftN) + ' → '
        + (worstAfter ? worstAfter.name + ' ' + pp(afterDrift(worstAfter)) : '—')
        + (isCash ? '. Buy-only, so overweight buckets stay overweight and drift can only fall as the denominator grows.' : '.'),

      flagCount: flags.length ? flags.length + (flags.length === 1 ? ' note' : ' notes') : '',
      flags: flags,
      noFlags: flags.length === 0,

      legNote: isCash
        ? 'apportioned inside each bucket by current value · sorted by size'
        : 'sells first, then buys · apportioned inside each bucket by current value',
      legFilters: ['All', 'Buys', 'Sells'].map((s) => ({
        label: s === 'All' ? 'All ' + legs.length : s + ' ' + legs.filter((l) => (s === 'Buys' ? l.sign > 0 : l.sign < 0)).length,
        bg: sideFilter === s ? 'var(--accent-soft)' : 'transparent',
        border: sideFilter === s ? 'var(--accent)' : 'var(--line)',
        color: sideFilter === s ? 'var(--accent)' : 'var(--t2)',
        weight: sideFilter === s ? 600 : 500,
        onClick: () => this.setState({ side: s })
      })),
      legHead: [
        { label: 'Holding', justify: 'flex-start', pos: 'sticky', z: 3 },
        { label: 'Category', justify: 'flex-start', pos: 'static', z: 1 },
        { label: 'Current', justify: 'flex-end', pos: 'static', z: 1 },
        { label: 'Side', justify: 'flex-end', pos: 'static', z: 1 },
        { label: 'Amount', justify: 'flex-end', pos: 'static', z: 1 },
        { label: 'After', justify: 'flex-end', pos: 'static', z: 1 },
        { label: 'Constraint', justify: 'flex-start', pos: 'static', z: 1 }
      ],
      legRows: shownLegs.map((l) => {
        const p = l.p, buy = l.sign > 0;
        const afterValue = p.value + l.exec;
        return {
          mono: p.mono, ticker: p.ticker, name: p.name,
          category: l.category,
          catSub: F.pct(cats.filter((c) => c.name === l.category)[0].targetN, 2) + ' target',
          value: money(p.value), weight: F.pct(V ? p.value / V * 100 : 0, 2) + ' of portfolio',
          side: buy ? 'Buy' : 'Sell',
          sideBg: buy ? 'var(--accent-soft)' : 'var(--hover)',
          sideFg: buy ? 'var(--accent)' : 'var(--t1)',
          amount: (l.blocked ? '—' : money(Math.abs(l.exec))),
          shares: l.blocked
            ? 'one share is ' + money(l.price)
            : F.num(l.shares, whole ? 0 : 4) + ' sh @ ' + money(l.price),
          amountTone: !l.blocked && buy ? 'pos' : 'plain',
          after: money(afterValue),
          afterSub: F.pct(afterTotal ? afterValue / afterTotal * 100 : 0, 2) + ' of portfolio',
          note: l.blocked
            ? 'Whole share costs more than the allocation'
            : l.fractional
              ? 'Needs fractional shares'
              : p.assetClass === 'ETN'
                ? 'ETN — distributions may return capital'
                : '',
          noteColor: l.blocked ? 'var(--amber)' : 'var(--t3)',
          bg: l.blocked ? 'var(--tag-bg)' : 'var(--card)',
          flagBorder: l.blocked ? '2px solid var(--amber)' : '2px solid transparent'
        };
      }),
      legsEmpty: shownLegs.length === 0,
      legsEmptyTitle: isCash && newCash <= 0
        ? 'Enter an amount to invest'
        : legs.length === 0 ? 'No trades suggested' : 'Nothing on this side',
      legsEmptyBody: isCash && newCash <= 0
        ? 'Type a deposit above, or pick one of the presets. The plan then buys only — no bucket is sold back to target.'
        : legs.length === 0
          ? 'Every bucket is inside the ' + money(minTrade) + ' minimum trade size, so there is nothing worth placing today.'
          : isCash ? 'Buy-only mode never sells.' : 'Switch back to All to see the whole plan.',

      footnote: 'Targets are not defined here. Every target weight, bucket and holding assignment is read live from the Categories model — '
        + cats.length + ' buckets, ' + T.holdings + ' holdings, currently ' + F.num(driftBefore, 2)
        + 'pp of total absolute drift — so a target edited there changes this plan. Within a bucket each leg is apportioned pro-rata by current value, which keeps the mix inside the bucket unchanged; legs under the '
        + money(minTrade) + ' minimum roll into the largest line in the same bucket rather than being dropped, so bucket totals are preserved. '
        + (isCash
          ? 'New cash is allocated buy-only by water-filling the underweight buckets: the objective is to minimise the largest remaining drift, subject to selling nothing. ' + money(execBuys) + ' of the ' + money(newCash) + ' deposit is allocated' + (parked > 0.5 ? ' and ' + money(parked) + ' rests in the money-market line, which the ' + F.pct(cashCat ? cashCat.targetN : 0, 2) + ' cash target wants anyway' : '') + '. '
          : 'Over-target buckets are sold back to target and the proceeds fund the under-target ones pro-rata to their shortfall; buys are capped by the funding available. The money-market line stands at the ' + money(float) + ' float and the cash bucket’s ' + F.pct(cashCat ? cashCat.targetN : 0, 2) + ' target values it at ' + money(cashCat ? cashCat.targetValue : 0) + ', so the ' + money(surplus) + ' above target is only spendable by breaching the float — ' + (useSurplus ? 'which this plan does, ending at ' + money(cashAfter) + '.' : 'which this plan does not do, so buys stop at ' + money(execSells) + '.') + ' ')
        + 'Prices are today’s marks, fees are ignored, and nothing here is placed — the plan is arithmetic, not an order ticket.'
    });
  }
}
