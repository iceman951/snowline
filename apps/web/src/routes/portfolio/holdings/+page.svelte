<!-- Portfolio → Holdings. Port of the bundle's Holdings.dc.html. -->
<script lang="ts">
  import { fmt } from '@snowline/core';
  import HoldingsTable from '$lib/components/HoldingsTable.svelte';
  import TopNav from '$lib/components/TopNav.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const T = $derived(data.screen.totals);
  const K = $derived(data.screen.constants);
  const holdings = $derived(data.screen.holdings);

  const summary = $derived([
    {
      label: 'Market value',
      primary: fmt.money(T.value),
      secondary: `${fmt.money(T.invested)} invested`,
      color: 'var(--t1)'
    },
    {
      label: 'Total profit',
      primary: fmt.signed(T.totalProfit),
      secondary: `${fmt.caret(T.totalProfitPct)} incl. dividends`,
      color: T.totalProfit >= 0 ? 'var(--accent)' : 'var(--neg)'
    },
    {
      label: 'Forward income',
      primary: fmt.money(T.forwardGross),
      secondary: `${fmt.pct(T.grossYield)} gross yield`,
      color: 'var(--t1)'
    },
    {
      label: 'Today',
      primary: fmt.signed(T.dayChange),
      secondary: `${fmt.caret(T.dayChangePct)} across ${T.holdings} positions`,
      color: T.dayChange >= 0 ? 'var(--accent)' : 'var(--neg)'
    }
  ]);

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

<svelte:head><title>Holdings · Snowline</title></svelte:head>

<TopNav
  active="Portfolio"
  subActive="Holdings"
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
          Holdings
        </h1>
        <span style="font-size:13px;color:var(--t3);padding-top:6px">{K.portfolioName}</span>
      </div>
      <div style="display:flex;align-items:center;gap:9px;font-size:12px;color:var(--t3)">
        <span>{T.holdings} open positions · {fmt.shares(T.shares)} shares</span>
        <span style="width:1px;height:10px;background:var(--line)"></span>
        <span>{T.soldCount} closed positions</span>
        <span style="width:1px;height:10px;background:var(--line)"></span>
        <span>As of {K.today.label}</span>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:6px;flex:none">
      <a
        href="/analytics"
        style="display:flex;align-items:center;height:32px;padding:0 12px;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--t2);font-size:12px;font-weight:500;text-decoration:none;white-space:nowrap"
        >Analytics view</a
      >
    </div>
  </div>

  <div
    data-r="kpi"
    style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden"
  >
    {#each summary as s (s.label)}
      <div style="display:flex;flex-direction:column;gap:4px;padding:15px 18px;border-right:1px solid var(--line)">
        <span style="font-size:11px;color:var(--t3)">{s.label}</span>
        <span style="font-size:19px;font-weight:600;letter-spacing:-0.02em;color:{s.color}">{s.primary}</span>
        <span style="font-size:11px;color:var(--t3)">{s.secondary}</span>
      </div>
    {/each}
  </div>

  <HoldingsTable {holdings} totals={T} constants={K} title="All positions" view="My holdings" />
</main>
