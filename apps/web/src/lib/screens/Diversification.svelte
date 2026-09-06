<script lang="ts">
  import { untrack } from "svelte";
  import Model from "$lib/presenters/Diversification";
  import AnalyticsSubnav from "$lib/components/AnalyticsSubnav.svelte";
  import DonutBreakdown from "$lib/components/DonutBreakdown.svelte";
  import TopNav from "$lib/components/TopNav.svelte";
  let { engine }: { engine: any } = $props();
  const model = $derived(new Model(engine));
  const view: any = $derived.by(() => { model.revision; return model.renderVals(); });
  $effect(() => { const current = model; untrack(() => current.componentDidMount?.()); return () => current.componentWillUnmount?.(); });
</script>


<div style="min-height:100vh;background:var(--canvas);color:var(--t1);font-size:14px;line-height:1.45">

  <TopNav active="Analytics" subActive="Diversification" portfolioName={engine.constants.portfolioName} holdingsCount={engine.totals().holdings} />

  <main data-r="main" data-screen-label="Analytics — Diversification" style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:22px">

    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
        <div style="display:flex;align-items:center;gap:9px">
          <h1 style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)">Diversification</h1>
          <span style="font-size:13px;color:var(--t3);padding-top:6px">{view.portfolioName}</span>
        </div>
        <div style="display:flex;align-items:center;gap:9px;font-size:12px;color:var(--t3)">
          <span>{view.headLines}</span>
          <span style="width:1px;height:10px;background:var(--line)"></span>
          <span>{view.headTop}</span>
        </div>
      </div>

      <button onclick={view.toggleXray} style="display:flex;align-items:center;gap:10px;height:36px;padding:0 12px;border:1px solid {view.xrayBorder};border-radius:8px;background:{view.xrayCardBg};color:var(--t1);font-size:13px;font-weight:500;cursor:pointer;flex:none" class="hover0">
        <span style="position:relative;width:34px;height:19px;flex:none;border-radius:999px;background:{view.xrayTrack};transition:background .15s ease">
          <span style="position:absolute;top:2px;left:{view.xrayKnob};width:15px;height:15px;border-radius:50%;background:var(--card);box-shadow:0 1px 3px rgba(0,0,0,.28);transition:left .15s ease"></span>
        </span>
        X-Ray Funds
        <span style="font-size:9px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--accent);background:var(--accent-soft);border-radius:3px;padding:2px 5px">New</span>
      </button>
    </div>

    <AnalyticsSubnav active="Diversification" />

    {#if view.xray}
      <div style="display:flex;align-items:flex-start;gap:11px;padding:13px 16px;background:var(--card);border:1px solid var(--line);border-left:2px solid var(--accent);border-radius:8px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.7" stroke-linecap="round" style="flex:none;margin-top:1px"><circle cx="12" cy="12" r="9"></circle><path d="M12 8h.01M12 11v5"></path></svg>
        <span style="font-size:12px;color:var(--t2);line-height:1.55;text-wrap:pretty">{view.xrayNote}</span>
      </div>
    {/if}

    <div data-r="sum" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
      {#each view.summary as s}
        <div style="display:flex;flex-direction:column;gap:4px;padding:15px 18px;border-right:1px solid var(--line)">
          <span style="font-size:11px;color:var(--t3)">{s.label}</span>
          <span style="font-size:19px;font-weight:600;letter-spacing:-0.02em;color:{s.color}">{s.primary}</span>
          <span style="font-size:11px;color:var(--t3)">{s.secondary}</span>
        </div>
      {/each}
    </div>

    <DonutBreakdown title="All holdings" subtitle={view.holdingsSubtitle} rows={view.holdingRows} toggles={view.holdingToggles} centerLabel="Portfolio value" unit="positions" nameHeader="Asset" valueHeader="Share / value" listHeight="352px" footer={view.holdingsFooter} />

    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      {#each view.pills as p}
        <button onclick={p.onClick} style="height:32px;padding:0 14px;border:1px solid {p.border};border-radius:999px;background:{p.bg};color:{p.color};font-size:13px;font-weight:500;cursor:pointer" class="hover1">{p.label}</button>
      {/each}
    </div>

    <DonutBreakdown title={view.dimTitle} subtitle={view.dimSubtitle} rows={view.dimRows} toggles={view.dimToggles} centerLabel={view.dimCenter} unit={view.dimUnit} nameHeader={view.dimHeader} valueHeader="Share / value" listHeight="352px" footer={view.dimFooter} />
  </main></div>

<style>
.hover0:hover{border-color:var(--t3)}
.hover1:hover{border-color:var(--t3)}
@media (max-width:1180px){
      [data-r="sum"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      
    }
    @media (max-width:960px){
      [data-r="sum"]{grid-template-columns:minmax(0,1fr)!important}
      
      
      
      [data-r="main"]{padding:16px 16px 104px!important}
      
    }
  
</style>
