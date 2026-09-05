<!-- Analytics → Common. Port of the bundle's Analytics.dc.html. -->
<script lang="ts">
  import { fmt } from '@snowline/core';
  import AnalyticsSubnav from '$lib/components/AnalyticsSubnav.svelte';
  import HoldingsTable from '$lib/components/HoldingsTable.svelte';
  import KpiRow from '$lib/components/KpiRow.svelte';
  import TopNav from '$lib/components/TopNav.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const T = $derived(data.screen.totals);
  const K = $derived(data.screen.constants);
  const holdings = $derived(data.screen.holdings);

  const searchItems = $derived(
    holdings
      .filter((h) => h.p.status === 'open')
      .map((h) => ({
        ticker: h.p.ticker,
        name: h.p.name,
        mono: h.p.mono,
        sector: h.p.sector,
        value: fmt.money(h.p.value),
        href: `/portfolio/holdings#${h.p.ticker}`
      }))
  );
</script>

<svelte:head><title>Analytics · Snowline</title></svelte:head>

<TopNav
  active="Analytics"
  subActive="Common"
  portfolioName={K.portfolioName}
  holdingsCount={T.holdings}
  {searchItems}
  accountSub={`${K.baseCurrency} · ${T.holdings} holdings`}
/>

<main
  data-r="main"
  style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:22px"
>
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
    <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
      <div style="display:flex;align-items:center;gap:9px">
        <h1 style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)">
          Analytics
        </h1>
        <span style="font-size:13px;color:var(--t3);padding-top:6px">{K.portfolioName}</span>
      </div>
      <div style="display:flex;align-items:center;gap:9px;font-size:12px;color:var(--t3)">
        <span>{K.baseCurrency} · {T.holdings} holdings · {fmt.money(T.value)}</span>
        <span style="width:1px;height:10px;background:var(--line)"></span>
        <span>{fmt.pct(K.withholdingTax * 100, 0)} dividend withholding</span>
        <span style="width:1px;height:10px;background:var(--line)"></span>
        <span>As of {K.today.label}</span>
      </div>
    </div>
    <a
      href="/analytics/report"
      style="display:flex;align-items:center;height:32px;padding:0 12px;flex:none;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--t2);font-size:12px;font-weight:500;text-decoration:none;white-space:nowrap"
      >Full report</a
    >
  </div>

  <AnalyticsSubnav active="Common" note="{K.portfolioName} · all time, through {K.today.label}" />

  <KpiRow totals={T} constants={K} />

  <HoldingsTable {holdings} totals={T} constants={K} title="All holdings" view="My holdings" showAdd={false} />
</main>
