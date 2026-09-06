// @ts-nocheck
/** Presentation and chart geometry from Diversification.dc.html; data comes from the core engine. */
import { Presenter } from "./presenter.svelte";
export default class DiversificationPresenter extends Presenter {
  state = { xray: false, dim: 'Sectors', buyIn: false, showHoldings: false };

  DIMS = {
    Sectors: { key: 'sector', title: 'Economy sectors', center: 'Sectors', unit: 'sectors', header: 'Sector' },
    Classes: { key: 'assetClass', title: 'Asset classes', center: 'Classes', unit: 'classes', header: 'Class' },
    Currencies: { key: 'currency', title: 'Currencies', center: 'Currencies', unit: 'currencies', header: 'Currency' },
    Regions: { key: 'region', title: 'Regions', center: 'Regions', unit: 'regions', header: 'Region' },
    Countries: { key: 'country', title: 'Countries', center: 'Countries', unit: 'countries', header: 'Country' }
  };

  /* positions being added to — drives the "Buy in" filter */
  BUYING = ['SCHD', 'JEPQ', 'V', 'GOOGL', 'BIL'];

  componentDidMount() {

  }

  renderVals() {
    const st = this.state;
    const I = {
      bars: 'M4 20V10M10 20V4M16 20v-7M22 20H2', table: 'M3 5h18v14H3V5Zm0 5h18M9 10v9',
      home: 'M4 11l8-7 8 7v9H4v-9Zm5 9v-6h6v6',
      scale: 'M12 4v16M6 8l-3 6h6l-3-6Zm12 0l-3 6h6l-3-6ZM5 8h14', dots: 'M5 12h.01M12 12h.01M19 12h.01'
    };
    const base = {
      xray: st.xray,
      toggleXray: () => this.setState((s) => ({ xray: !s.xray })),
      xrayTrack: st.xray ? 'var(--accent)' : 'var(--line)',
      xrayKnob: st.xray ? '17px' : '2px',
      xrayBorder: st.xray ? 'var(--accent)' : 'var(--line)',
      xrayCardBg: st.xray ? 'var(--accent-soft)' : 'var(--card)',
      pills: Object.keys(this.DIMS).map((k) => ({
        label: k,
        bg: st.dim === k ? 'var(--accent-soft)' : 'var(--card)',
        color: st.dim === k ? 'var(--accent)' : 'var(--t2)',
        border: st.dim === k ? 'var(--accent)' : 'var(--line)',
        onClick: () => this.setState({ dim: k })
      })),
      tabRows: [
        { label: 'Dashboard', d: I.home, href: '/', color: 'var(--t3)' },
        { label: 'Analytics', d: I.bars, href: '/analytics', color: 'var(--accent)' },
        { label: 'Portfolio', d: I.table, href: '/portfolio/holdings', color: 'var(--t3)' },
        { label: 'Tools', d: I.scale, href: '/tools/rebalancing', color: 'var(--t3)' }
      ]
    };
    if (!this.data) return base;

    const D = this.data, F = D.fmt, K = D.constants, T = D.totals();
    const dim = this.DIMS[st.dim];

    let holdingRows = D.breakdown('holdings', st.xray).map((r) => ({
      name: r.name, subLabel: r.subLabel + (r.via.length ? ' · via ' + r.via.join(', ') : ''), value: r.value
    }));
    if (st.buyIn) {
      holdingRows = holdingRows.filter((r) => this.BUYING.some((t) => r.name === t || r.subLabel.indexOf('via ' + t) >= 0 || r.subLabel.indexOf(', ' + t) >= 0));
    }

    const dimRows = D.breakdown(dim.key, st.xray).map((r) => ({
      name: r.name,
      subLabel: st.showHoldings ? r.count + (r.count === 1 ? ' line' : ' lines') : '',
      value: r.value
    }));

    const lines = D.lookThrough(st.xray);
    const top = D.breakdown('holdings', st.xray)[0];
    const sectors = D.breakdown('sector', st.xray);
    const uniqueNames = D.breakdown('holdings', true).length;
    const hhi = sectors.reduce((s, r) => s + Math.pow(r.pct, 2), 0);

    return Object.assign(base, {
      portfolioName: K.portfolioName,
      headLines: (st.xray ? lines.length + ' look-through lines' : T.holdings + ' positions') + ' · ' + F.money(T.value),
      headTop: 'Largest single exposure ' + top.name + ' ' + F.pct(top.pct, 1),
      xrayNote: 'Funds are decomposed into their published holdings, so single-stock exposure shows up even where you hold no shares directly. ' + uniqueNames + ' distinct names sit behind ' + T.holdings + ' positions; the undisclosed remainder of each fund stays classified as Funds.',
      summary: [
        { label: 'Largest position', primary: F.pct(top.pct, 1), secondary: top.name + ' · ' + F.money(top.value), color: 'var(--t1)' },
        { label: 'Top 5 concentration', primary: F.pct(D.breakdown('holdings', st.xray).slice(0, 5).reduce((s, r) => s + r.pct, 0), 1), secondary: 'of portfolio value', color: 'var(--t1)' },
        { label: 'Sectors represented', primary: String(sectors.length), secondary: 'largest ' + sectors[0].name + ' ' + F.pct(sectors[0].pct, 1), color: 'var(--t1)' },
        { label: 'Concentration index', primary: F.num(hhi / 100, 0), secondary: hhi > 2500 ? 'highly concentrated' : hhi > 1500 ? 'moderately concentrated' : 'well spread', color: hhi > 2500 ? 'var(--amber)' : 'var(--t1)' }
      ],

      holdingsSubtitle: st.xray ? 'look-through · ' + holdingRows.length + ' lines' : T.holdings + ' positions',
      holdingRows: holdingRows,
      holdingToggles: [{
        label: 'Buy in', on: st.buyIn,
        onClick: () => this.setState((s) => ({ buyIn: !s.buyIn }))
      }],
      holdingsFooter: st.buyIn ? 'Filtered to the ' + this.BUYING.length + ' positions you are currently adding to.' : '',

      dimTitle: dim.title,
      dimSubtitle: dimRows.length + ' ' + dim.unit + (st.xray ? ' · look-through' : ''),
      dimRows: dimRows,
      dimCenter: dim.center,
      dimUnit: dim.unit,
      dimHeader: dim.header,
      dimFooter: st.xray ? 'Fund holdings are classified by their own sector; the undisclosed remainder stays under Funds.' : 'Turn on X-Ray Funds to see the sectors inside your ETFs.',
      dimToggles: [
        { label: 'Buy in', on: st.buyIn, onClick: () => this.setState((s) => ({ buyIn: !s.buyIn })) },
        { label: 'Show holdings', on: st.showHoldings, onClick: () => this.setState((s) => ({ showHoldings: !s.showHoldings })) }
      ]
    });
  }
}
