<!-- AnalyticsSubnav — port of the bundle's AnalyticsSubnav.dc.html. -->
<script lang="ts">
  import { ANALYTICS_ROWS } from '$lib/nav';

  let { active = 'Common', note = '' }: { active?: string; note?: string } = $props();

  const tabs = $derived(ANALYTICS_ROWS.filter((r) => r.label));
</script>

<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line);overflow-x:auto">
  <div style="display:flex;align-items:center;gap:2px">
    {#each tabs as t (t.label)}
      <a
        href={t.href}
        style="display:flex;align-items:center;gap:7px;height:38px;padding:0 12px;border-bottom:2px solid {t.label ===
        active
          ? 'var(--accent)'
          : 'transparent'};color:{t.label === active
          ? 'var(--accent)'
          : 'var(--t2)'};font-size:13px;font-weight:{t.label === active
          ? 600
          : 500};text-decoration:none;white-space:nowrap;margin-bottom:-1px"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity={t.label === active ? 1 : 0.6}><path d={t.d} /></svg
        >
        {t.label}
      </a>
    {/each}
  </div>
  {#if note}
    <span style="font-size:12px;color:var(--t3);white-space:nowrap;padding-right:4px">{note}</span>
  {/if}
</div>
