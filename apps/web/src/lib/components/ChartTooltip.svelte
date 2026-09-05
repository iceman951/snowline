<!-- ChartTooltip — port of the bundle's ChartTooltip.dc.html. -->
<script lang="ts">
  import type { TooltipData } from '$lib/charts';

  let { tip }: { tip: TooltipData } = $props();

  const rows = $derived(
    (tip.rows ?? []).map((r) => ({
      ...r,
      color: r.color || 'var(--t3)',
      valueColor: r.tone === 'pos' ? 'var(--accent)' : r.tone === 'neg' ? 'var(--neg)' : 'var(--t1)'
    }))
  );
  const footerColor = $derived(
    tip.footerTone === 'neg' ? 'var(--neg)' : tip.footerTone === 'pos' ? 'var(--accent)' : 'var(--t2)'
  );
</script>

<div
  style="min-width:212px;max-width:280px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:11px 12px;display:flex;flex-direction:column;gap:9px"
>
  <div style="display:flex;flex-direction:column;gap:3px">
    <span
      style="font-size:10px;font-weight:500;letter-spacing:0.07em;text-transform:uppercase;color:var(--t3)"
      >{tip.title}</span
    >
    <span
      style="font-size:17px;font-weight:600;letter-spacing:-0.02em;color:var(--t1);line-height:1.1"
      >{tip.headline}</span
    >
    {#if tip.sub}
      <span style="font-size:11px;color:var(--t3);line-height:1.4">{tip.sub}</span>
    {/if}
  </div>

  {#if rows.length}
    <div style="display:flex;flex-direction:column;gap:0">
      <div style="height:1px;background:var(--line);margin-bottom:8px"></div>
      <div style="display:flex;flex-direction:column;gap:6px">
        {#each rows as r (r.label)}
          <div style="display:flex;align-items:center;justify-content:space-between;gap:18px">
            <span style="display:flex;align-items:center;gap:7px;min-width:0">
              <span style="width:7px;height:7px;flex:none;border-radius:1px;background:{r.color}"
              ></span>
              <span
                style="font-size:12px;color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
                >{r.label}</span
              >
            </span>
            <span style="font-size:12px;font-weight:500;color:{r.valueColor};white-space:nowrap"
              >{r.value}</span
            >
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if tip.footer}
    <div style="display:flex;flex-direction:column;gap:0">
      <div style="height:1px;background:var(--line);margin-bottom:8px"></div>
      <span style="font-size:11px;font-weight:500;color:{footerColor}">{tip.footer}</span>
    </div>
  {/if}
</div>
