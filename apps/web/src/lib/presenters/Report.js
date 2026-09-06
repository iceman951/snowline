// @ts-nocheck
/** Presentation and chart geometry from Report.dc.html; data comes from the core engine. */
import { Presenter } from "./presenter.svelte";
export default class ReportPresenter extends Presenter {
  state = {
    grouping: null, period: 'Last 1 year',
    menu: null, plotted: [], hover: null, benchmark: false, toast: ''
  };

  componentDidMount() {
    this.doc = () => { if (this.state.menu) this.setState({ menu: null }); };
    document.addEventListener('click', this.doc);

  }
  componentWillUnmount() {
    if (this.doc) document.removeEventListener('click', this.doc);
    if (this.toastT) clearTimeout(this.toastT);
  }

  say(msg) {
    if (this.toastT) clearTimeout(this.toastT);
    this.setState({ toast: msg });
    this.toastT = setTimeout(() => this.setState({ toast: '' }), 3600);
  }

  niceMax(raw, steps) {
    if (!(raw > 0)) return steps;
    const mag = Math.pow(10, Math.floor(Math.log10(raw / steps)));
    const cands = [1, 2, 2.5, 5, 10];
    for (let m = mag; m <= mag * 100000; m *= 10) {
      for (const c of cands) { const s = c * m; if (s * steps >= raw) return s * steps; }
    }
    return Math.ceil(raw / steps) * steps;
  }

  /* one bucket per column: levels come from the last month in the bucket,
     flows are summed across it */
  group(months, mode) {
    if (mode === 'Monthly') return months.map((m) => Object.assign({ colLabel: m.short }, m));
    const order = [], by = {};
    months.forEach((m) => {
      const k = mode === 'Quarterly'
        ? 'Q' + (Math.floor(m.monthIndex / 3) + 1) + " '" + String(m.year).slice(2)
        : String(m.year);
      if (!by[k]) { by[k] = []; order.push(k); }
      by[k].push(m);
    });
    return order.map((k) => {
      const g = by[k], first = g[0], last = g[g.length - 1];
      const s = (f) => g.reduce((a, m) => a + m[f], 0);
      return {
        colLabel: k, key: k, value: last.value, begin: first.begin, end: last.end,
        change: s('change'), dividends: s('dividends'), taxes: s('taxes'), fees: s('fees'),
        deposits: s('deposits'), withdrawals: s('withdrawals'),
        totalProfit: last.totalProfit, capitalGain: last.capitalGain
      };
    });
  }

  csv(cols, rows) {
    const esc = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const lines = [['Metric'].concat(cols.map((c) => c.colLabel)).map(esc).join(',')];
    rows.forEach((r) => lines.push([r.label].concat(cols.map((c) => r.get(c).toFixed(2))).map(esc).join(',')));
    return lines.join('\r\n');
  }

  download(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  renderVals() {
    const st = Object.assign({}, this.state);
    if (st.grouping === null) st.grouping = this.getProps().defaultGrouping || 'Monthly';
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
      ],
      stop: (e) => e.stopPropagation()
    };
    if (!this.data) return base;

    const D = this.data, F = D.fmt, K = D.constants;
    const PERIODS = [
      { label: 'Last 1 year', range: '1y', note: '12 months' },
      { label: 'Year to date', range: 'YTD', note: String(K.today.year) },
      { label: 'All time', range: 'all', note: 'since Oct 2024' }
    ];
    const period = PERIODS.filter((p) => p.label === st.period)[0] || PERIODS[0];
    const months = D.historyRange(period.range);
    const cols = this.group(months, st.grouping);
    const benchAll = D.benchmarkValuePath();
    const benchByKey = {};
    benchAll.forEach((b) => { benchByKey[b.key] = b.value; });

    /* --- row definitions; the last four sit behind the upgrade bar -------- */
    const ROWS = [
      { id: 'value', label: 'Portfolio value', get: (c) => c.value, kind: 'level' },
      { id: 'begin', label: 'At the beginning of the period', get: (c) => c.begin, kind: 'level' },
      { id: 'end', label: 'At the end of the period', get: (c) => c.end, kind: 'level' },
      { id: 'change', label: 'Change', get: (c) => c.change, kind: 'signed' },
      { id: 'profit', label: 'Total profit', get: (c) => c.totalProfit, kind: 'signed' },
      { id: 'capital', label: 'Capital gain', get: (c) => c.capitalGain, kind: 'signed' },
      { id: 'dividends', label: 'Dividends', get: (c) => c.dividends, kind: 'flow' },
      { id: 'taxes', label: 'Taxes', get: (c) => c.taxes, kind: 'flow' },
      { id: 'fees', label: 'Fees', get: (c) => c.fees, kind: 'flow' },
      { id: 'deposits', label: 'Deposits', get: (c) => c.deposits, kind: 'flow' },
      { id: 'withdrawals', label: 'Withdrawals', get: (c) => c.withdrawals, kind: 'flow' }
    ];
    const free = ROWS.filter((r) => !r.locked);
    const RAMP = ['var(--accent)', 'var(--accent-2)', 'var(--accent-3)', 'var(--grey-series)'];
    const plotted = st.plotted.filter((id) => free.some((r) => r.id === id));
    const colorOf = (id) => RAMP[plotted.indexOf(id) % RAMP.length];

    /* --- bars: portfolio value, always the left axis ---------------------- */
    const yMax = this.niceMax(Math.max.apply(null, cols.map((c) =>
      Math.max(c.value, st.benchmark ? (benchByKey[c.key] || 0) : 0))), 4);
    const bars = cols.map((c, i) => {
      const on = st.hover === i;
      return {
        h: Math.max(1, c.value / yMax * 100).toFixed(2) + '%',
        fill: on ? 'var(--accent)' : 'var(--accent-4)',
        slotBg: on ? 'var(--hover)' : 'transparent',
        tickLabel: cols.length > 18 && i % 2 ? '' : c.colLabel,
        onEnter: () => this.setState({ hover: i }),
        onLeave: () => this.setState({ hover: null })
      };
    });

    /* --- lines: plotted rows share one right axis, all being dollars ------ */
    const series = plotted.map((id) => {
      const r = free.filter((x) => x.id === id)[0];
      return { id: id, label: r.label, values: cols.map(r.get), color: colorOf(id) };
    });
    const flat = series.reduce((a, s) => a.concat(s.values), []);
    let rMin = 0, rMax = 1;
    if (flat.length) {
      const lo = Math.min.apply(null, flat), hi = Math.max.apply(null, flat);
      rMax = this.niceMax(Math.max(Math.abs(lo), Math.abs(hi)), 4);
      rMin = lo < 0 ? -rMax : 0;
    }
    const px = (i) => cols.length < 2 ? 500 : (i + 0.5) / cols.length * 1000;
    const ry = (v) => 216 - (v - rMin) / (rMax - rMin) * 200 - 8;
    const by = (v) => 216 - v / yMax * 216;
    const lines = series.map((s) => ({
      color: s.color, dash: 'none',
      d: s.values.map((v, i) => (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + ry(v).toFixed(1)).join(' ')
    }));
    if (st.benchmark) {
      lines.push({
        color: 'var(--grey-series)', dash: '5 4',
        d: cols.map((c, i) => (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + by(benchByKey[c.key] || 0).toFixed(1)).join(' ')
      });
    }

    const legend = [{ label: 'Portfolio value', color: 'var(--accent-4)', h: '9px' }]
      .concat(st.benchmark ? [{ label: K.benchmark + ' equivalent', color: 'var(--grey-series)', h: '3px' }] : [])
      .concat(series.map((s) => ({ label: s.label, color: s.color, h: '3px' })));

    /* --- tooltip ---------------------------------------------------------- */
    const hi = st.hover;
    const hc = hi === null ? null : cols[hi];
    const tip = !hc ? null : {
      title: hc.colLabel,
      headline: F.money(hc.value),
      sub: st.grouping === 'Monthly' ? 'Value at month end' : 'Value at period end',
      rows: [
        { label: 'Change', value: F.signed(hc.change), color: 'var(--accent-4)', tone: F.tone(hc.change) },
        { label: 'Dividends', value: F.money(hc.dividends), color: 'var(--accent-3)' }
      ].concat(st.benchmark ? [{
        label: K.benchmark + ' equivalent', value: F.money(benchByKey[hc.key] || 0), color: 'var(--grey-series)'
      }] : []).concat(series.map((s) => ({
        label: s.label, value: F.signed(s.values[hi]), color: s.color, tone: F.tone(s.values[hi])
      }))),
      footer: hc.deposits > 0 ? 'Deposits ' + F.money(hc.deposits) : ''
    };
    const tipPos = hi === null ? 0 : (hi + 0.5) / cols.length * 100;

    const cellText = (r, c) => {
      const v = r.get(c);
      if (r.kind === 'signed') return F.signed(v);
      if (r.kind === 'flow' && v === 0) return '—';
      return F.money(v);
    };
    const cellColor = (r, c) => {
      const v = r.get(c);
      if (r.kind === 'signed') return v > 0 ? 'var(--accent)' : v < 0 ? 'var(--neg)' : 'var(--t2)';
      if (r.kind === 'flow' && v === 0) return 'var(--t3)';
      return 'var(--t1)';
    };
    const rowOf = (r, locked) => {
      const on = plotted.indexOf(r.id) >= 0;
      return {
        label: r.label,
        bg: on ? 'var(--accent-soft)' : 'var(--card)',
        rule: on ? colorOf(r.id) : 'transparent',
        dot: on ? colorOf(r.id) : 'transparent',
        dotBorder: on ? colorOf(r.id) : 'var(--line)',
        cells: cols.map((c) => ({
          text: cellText(r, c),
          color: locked ? 'var(--t2)' : cellColor(r, c),
          bg: 'transparent'
        })),
        onClick: () => this.setState({
          plotted: on ? plotted.filter((x) => x !== r.id) : plotted.concat([r.id])
        }),
        onEnter: () => {}, onLeave: () => {}
      };
    };

    const menuOpen = (k) => st.menu === k;
    const picker = (k, title, value, options) => ({
      title: title, value: value, open: menuOpen(k),
      bg: menuOpen(k) ? 'var(--hover)' : 'var(--card)',
      onToggle: (e) => { e.stopPropagation(); this.setState({ menu: menuOpen(k) ? null : k }); },
      options: options
    });

    return Object.assign(base, {
      portfolioName: K.portfolioName,
      headSpan: cols.length + ' ' + (st.grouping === 'Monthly' ? 'months' : st.grouping === 'Quarterly' ? 'quarters' : 'years') + ' · ' + months[0].key + ' – ' + months[months.length - 1].key,
      headValue: 'Ending value ' + F.money(cols[cols.length - 1].value),

      benchLabel: st.benchmark ? K.benchmark : 'Select',
      benchBg: st.benchmark ? 'var(--accent-soft)' : 'var(--card)',
      benchBorder: st.benchmark ? 'var(--accent)' : 'var(--line)',
      mBench: menuOpen('bench'),
      togBench: (e) => { e.stopPropagation(); this.setState({ menu: menuOpen('bench') ? null : 'bench' }); },
      benchRows: [
        {
          label: K.benchmark, on: st.benchmark, cursor: 'pointer', opacity: 1,
          hint: 'The same deposits, run at ' + K.benchmark + "'s monthly returns.",
          onClick: (e) => { e.stopPropagation(); this.setState({ benchmark: !st.benchmark }); }
        },
        {
          label: 'Add a benchmark…', on: false, cursor: 'not-allowed', opacity: 0.55,
          hint: 'Only ' + K.benchmark + ' has a price history in this portfolio.',
          onClick: (e) => e.stopPropagation()
        }
      ].map((b) => Object.assign(b, {
        boxBg: b.on ? 'var(--accent)' : 'transparent',
        boxBorder: b.on ? 'var(--accent)' : 'var(--line)',
        tick: b.on ? 'var(--on-accent)' : 'transparent'
      })),

      hint: 'Click a row in the table to make it appear on the graph',
      anySelected: plotted.length > 0 || st.benchmark,
      clearAll: () => this.setState({ plotted: [], benchmark: false }),

      chartTitle: 'Portfolio value by ' + (st.grouping === 'Monthly' ? 'month' : st.grouping === 'Quarterly' ? 'quarter' : 'year'),
      legend: legend,
      bars: bars,
      lines: lines,
      hasLines: lines.length > 0,
      yTicks: [4, 3, 2, 1, 0].map((i) => ({ label: F.k(yMax / 4 * i), op: i === 0 ? 0 : 1 })),
      hasRightAxis: series.length > 0,
      rTicks: [4, 3, 2, 1, 0].map((i) => ({ label: F.k(rMin + (rMax - rMin) / 4 * i) })),
      tip: tip,
      tipLeft: tipPos.toFixed(2) + '%',
      tipShift: tipPos > 62 ? '-92%' : tipPos < 20 ? '-8%' : '-50%',

      exports: [
        {
          label: 'Export to PDF',
          onClick: () => { this.say('Opening the print view…'); setTimeout(() => window.print(), 260); }
        },
        {
          label: 'Export to Excel',
          onClick: () => {
            this.download('snowline-report-' + st.grouping.toLowerCase() + '.csv', this.csv(cols, free));
            this.say('Downloaded ' + free.length + ' rows × ' + cols.length + ' columns (CSV).');
          }
        }
      ],
      toast: st.toast,

      pickers: [
        picker('group', 'Time grouping', st.grouping, ['Monthly', 'Quarterly', 'Annual'].map((g) => ({
          label: g, note: '', bg: st.grouping === g ? 'var(--accent-soft)' : 'transparent',
          color: st.grouping === g ? 'var(--accent)' : 'var(--t1)',
          weight: st.grouping === g ? 600 : 400,
          onClick: (e) => { e.stopPropagation(); this.setState({ grouping: g, menu: null, hover: null }); }
        }))),
        picker('period', 'Time period', st.period, PERIODS.map((p) => ({
          label: p.label, note: p.note,
          bg: st.period === p.label ? 'var(--accent-soft)' : 'transparent',
          color: st.period === p.label ? 'var(--accent)' : 'var(--t1)',
          weight: st.period === p.label ? 600 : 400,
          onClick: (e) => { e.stopPropagation(); this.setState({ period: p.label, menu: null, hover: null }); }
        })))
      ],

      gridCols: '236px repeat(' + cols.length + ', minmax(112px, 1fr))',
      minWidth: (236 + cols.length * 112) + 'px',
      cols: cols.map((c, i) => ({
        label: c.colLabel,
        bg: st.hover === i ? 'var(--hover)' : 'transparent',
        color: st.hover === i ? 'var(--t1)' : 'var(--t2)'
      })),
      freeRows: free.map((r) => rowOf(r, false)),
      footnote: 'Levels (portfolio value, beginning, end) are taken at the close of each ' + (st.grouping === 'Monthly' ? 'month' : st.grouping === 'Quarterly' ? 'quarter' : 'year') + '; flows (change, dividends, deposits) are summed across it. Dividends are net of ' + F.num(K.withholdingTax * 100, 0) + '% withholding tax.'
    });
  }
}
