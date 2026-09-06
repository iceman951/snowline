// @ts-nocheck
/** Presentation and chart geometry from DonutBreakdown.dc.html; data comes from the core engine. */
import { Presenter } from "./presenter.svelte";
export default class DonutBreakdownPresenter extends Presenter {
  state = { hover: null };

  renderVals() {
    const p = this.getProps();
    const rows = (p.rows || []).filter((r) => r.value > 0);
    const total = rows.reduce((s, r) => s + r.value, 0);
    const F = this.data ? this.data.fmt : null;
    const money = (n) => F ? F.money(n) : '$' + n.toFixed(2);
    const pct = (n) => F ? F.pct(n, n < 1 ? 2 : 1) : n.toFixed(1) + '%';

    const ramp = (n) => {
      const out = [];
      for (let i = 0; i < n; i++) {
        const w = n === 1 ? 100 : Math.round(100 - i * (92 / (n - 1)));
        out.push('color-mix(in oklab, var(--accent) ' + w + '%, var(--grey-series))');
      }
      return out;
    };
    const colors = ramp(Math.max(1, rows.length));
    const hov = this.state.hover;

    const C = 2 * Math.PI * 86;
    let acc = 0;
    const segs = [];
    const labels = [];
    rows.forEach((r, i) => {
      const share = total ? r.value / total : 0;
      const len = share * C;
      const gap = rows.length > 14 ? 1.2 : 2.5;
      segs.push({
        color: colors[i], dash: Math.max(0.6, len - gap).toFixed(2) + ' ' + (C - Math.max(0.6, len - gap)).toFixed(2),
        offset: (-acc).toFixed(2), sw: hov === r.name ? 26 : 22,
        op: hov === null || hov === r.name ? 1 : 0.3,
        onEnter: () => this.setState({ hover: r.name }),
        onLeave: () => this.setState({ hover: null })
      });
      if (share >= 0.045) {
        const mid = (acc + len / 2) / C * 2 * Math.PI - Math.PI / 2;
        const rr = 118;
        labels.push({
          text: pct(share * 100),
          x: (50 + Math.cos(mid) * rr / 280 * 100).toFixed(2) + '%',
          y: (50 + Math.sin(mid) * rr / 280 * 100).toFixed(2) + '%',
          color: hov === null || hov === r.name ? 'var(--t2)' : 'var(--t3)'
        });
      }
      acc += len;
    });

    const hovRow = rows.filter((r) => r.name === hov)[0];
    const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;

    const toggles = (p.toggles || []).map((t) => ({
      label: t.label, mark: t.on ? '✓' : '',
      bg: t.on ? 'var(--accent)' : 'transparent',
      border: t.on ? 'var(--accent)' : 'var(--line)',
      color: t.on ? 'var(--t1)' : 'var(--t2)',
      onClick: t.onClick
    }));

    return {
      title: p.title || '',
      subtitle: p.subtitle || '',
      toggles: toggles,
      segs: segs, labels: labels,
      centerValue: hovRow ? money(hovRow.value) : money(total),
      centerLabel: hovRow ? hovRow.name : (p.centerLabel || 'Total'),
      centerSub: hovRow ? pct(total ? hovRow.value / total * 100 : 0) : rows.length + ' ' + (p.unit || 'lines'),
      nameHeader: p.nameHeader || 'Name',
      valueHeader: p.valueHeader || 'Share / value',
      listHeight: p.listHeight || '318px',
      footer: p.footer || '',
      rows: rows.map((r, i) => ({
        name: r.name, subLabel: r.subLabel || '',
        pct: pct(total ? r.value / total * 100 : 0), value: money(r.value),
        color: colors[i], barWidth: (r.value / max * 100).toFixed(1) + '%',
        bg: hov === r.name ? 'var(--hover)' : 'transparent',
        onEnter: () => this.setState({ hover: r.name }),
        onLeave: () => this.setState({ hover: null })
      }))
    };
  }
}
