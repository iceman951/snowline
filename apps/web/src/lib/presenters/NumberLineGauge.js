// @ts-nocheck
/** Presentation and chart geometry from NumberLineGauge.dc.html; data comes from the core engine. */
import { Presenter } from "./presenter.svelte";
export default class NumberLineGaugePresenter extends Presenter {
  renderVals() {
    const p = this.getProps();
    const min = p.min === undefined ? 0 : p.min;
    const max = p.max === undefined ? 100 : p.max;
    const span = (max - min) || 1;
    const pos = (v) => (v - min) / span * 100;
    const clamp = (v) => Math.min(99.2, Math.max(0.8, pos(v)));
    const marks = p.markers || [];
    const primary = marks.filter((m) => m.primary !== false)[0];
    const tone = p.verdictTone || 'neutral';

    /* an interior tick is a hairline; the two endpoints get a taller one */
    const ticks = (p.tickValues || []).map((v) => ({
      x: Math.min(100, Math.max(0, pos(v))).toFixed(2) + '%',
      h: v === min || v === max ? '9px' : '6px'
    }));

    /* labels stagger up when two markers land within 16% of each other */
    const at = marks.map((m) => pos(m.value));
    return {
      hasHead: !!(p.statement || p.verdict),
      statement: p.statement ?? '',
      verdict: p.verdict ?? '',
      verdictBg: tone === 'good' ? 'var(--accent-soft)' : tone === 'attention' ? 'var(--tag-bg)' : 'var(--chip-bg)',
      verdictFg: tone === 'good' ? 'var(--accent)' : tone === 'attention' ? 'var(--tag-fg)' : 'var(--t2)',
      note: p.note ?? '',
      ticks: ticks,
      fillWidth: primary ? clamp(primary.value).toFixed(2) + '%' : '0%',
      minLabel: p.minLabel || String(min),
      maxLabel: p.maxLabel || String(max),
      markers: marks.map((m, i) => {
        const near = at.some((q, j) => j < i && Math.abs(q - at[i]) < 16);
        const isPrimary = m.primary !== false;
        return {
          x: clamp(m.value).toFixed(2) + '%',
          label: m.label,
          value: m.display ?? String(m.value),
          color: isPrimary ? 'var(--accent)' : 'var(--t2)',
          labelColor: isPrimary ? 'var(--t2)' : 'var(--t3)',
          fill: isPrimary ? 'var(--accent)' : 'var(--card)',
          size: isPrimary ? '11px' : '9px',
          dotTop: isPrimary ? '34px' : '35px',
          radius: m.shape === 'square' ? '2px' : '50%',
          rotate: m.shape === 'diamond' ? '45deg' : '0deg',
          labelTop: near ? '0px' : '16px',
          z: isPrimary ? 3 : 2
        };
      })
    };
  }
}
