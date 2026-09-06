// @ts-nocheck
/** Presentation and chart geometry from RangeTabs.dc.html; data comes from the core engine. */
import { Presenter } from "./presenter.svelte";
export default class RangeTabsPresenter extends Presenter {
  renderVals() {
    const p = this.getProps();
    const value = p.value || 'all';
    const list = p.options || ['7d', '1m', '3m', '6m', 'YTD', '1y', '5y', 'all'];
    return {
      tabs: list.map((t) => ({
        label: t,
        bg: t === value ? 'var(--accent-soft)' : 'transparent',
        color: t === value ? 'var(--accent)' : 'var(--t2)',
        weight: t === value ? 600 : 500,
        onClick: () => p.onChange && p.onChange(t)
      })),
      onCustom: () => p.onChange && p.onChange('custom'),
      customBg: value === 'custom' ? 'var(--accent-soft)' : 'transparent',
      customColor: value === 'custom' ? 'var(--accent)' : 'var(--t3)'
    };
  }
}
