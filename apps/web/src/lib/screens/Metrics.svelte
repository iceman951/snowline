<script lang="ts">
  import { untrack } from "svelte";
  import Model from "$lib/presenters/Metrics";
  import AnalyticsSubnav from "$lib/components/AnalyticsSubnav.svelte";
  import Metric from "$lib/components/Metric.svelte";
  import NumberLineGauge from "$lib/components/NumberLineGauge.svelte";
  import TopNav from "$lib/components/TopNav.svelte";
  let { engine }: { engine: any } = $props();
  const model = $derived(new Model(engine));
  const view: any = $derived.by(() => { model.revision; return model.renderVals(); });
  $effect(() => { const current = model; untrack(() => current.componentDidMount?.()); return () => current.componentWillUnmount?.(); });
</script>


<div style="min-height:100vh;background:var(--canvas);color:var(--t1);font-size:14px;line-height:1.45">

  <TopNav active="Analytics" subActive="Metrics" portfolioName={engine.constants.portfolioName} holdingsCount={engine.totals().holdings} />

  <main data-r="main" data-screen-label="Analytics — Metrics" style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:22px">

    <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
      <div style="display:flex;align-items:center;gap:9px">
        <h1 style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)">Metrics</h1>
        <span style="font-size:13px;color:var(--t3);padding-top:6px">{view.portfolioName}</span>
      </div>
      <div style="display:flex;align-items:center;gap:9px;font-size:12px;color:var(--t3);flex-wrap:wrap">
        <span>{view.headPositions}</span>
        <span style="width:1px;height:10px;background:var(--line)"></span>
        <span>{view.headTwr}</span>
      </div>
    </div>

    <AnalyticsSubnav active="Metrics" />

    <div data-r="twr" style="display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:30px;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:20px">
      <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
        <Metric label="Portfolio TWR" tip={view.twrTip} dotted={true} primary={view.twrValue} primaryTone="pos" secondary={view.twrSpan} secondaryNote="" />
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="display:inline-flex;align-items:center;gap:8px;height:28px;padding:0 11px;border:1px solid var(--line);border-radius:999px;background:var(--hover);font-size:12px;white-space:nowrap">
            <span style="width:7px;height:7px;border-radius:2px;background:var(--grey-series)"></span>
            <span style="color:var(--t1);font-weight:500">{view.benchLabel}</span>
            <span style="color:var(--t1)">{view.benchValue}</span>
            <span style="color:var(--t2)">{view.benchGap}</span>
          </span>
        </div>
        <span style="font-size:12px;line-height:1.55;color:var(--t2)">True performance over the portfolio's lifetime, excluding the impact of cash flows.</span>
        <span style="font-size:11px;line-height:1.5;color:var(--t3);border-top:1px solid var(--line);padding-top:9px">{view.twrNote}</span>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;min-width:0">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
          <span style="font-size:12px;font-weight:500;color:var(--t2)">Cumulative time-weighted return</span>
          <div style="display:flex;align-items:center;gap:14px">
            {#each view.twrLegend as l}
              <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t2);white-space:nowrap">
                <span style="width:12px;height:3px;border-radius:2px;background:{l.color}"></span>{l.label}
                <span style="color:var(--t1);font-weight:500">{l.value}</span>
              </span>
            {/each}
          </div>
        </div>
        <div style="position:relative">
          <svg viewBox="0 0 1000 170" preserveAspectRatio="none" style="width:100%;height:160px;display:block">
            {#each view.twrGrid as g}
              <line x1="0" y1="{g.y}" x2="1000" y2="{g.y}" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 5" vector-effect="non-scaling-stroke"></line>
            {/each}
            <path d="{view.twrBench}" fill="none" stroke="var(--grey-series)" stroke-width="1.6" stroke-dasharray="5 4" vector-effect="non-scaling-stroke" stroke-linejoin="round"></path>
            <path d="{view.twrLine}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"></path>
          </svg>
          {#each view.twrGrid as g}
            <span style="position:absolute;left:0;top:{g.top};transform:translateY(-50%);font-size:10px;color:var(--t3);background:var(--card);padding-right:5px;pointer-events:none">{g.label}</span>
          {/each}
        </div>
        <div style="display:flex;justify-content:space-between">
          {#each view.twrXLabels as x}
            <span style="font-size:10px;color:var(--t3)">{x.label}</span>
          {/each}
        </div>
      </div>
    </div>

    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:2px">
      <div style="display:flex;flex-direction:column;gap:3px">
        <span style="font-size:16px;font-weight:600;color:var(--t1);letter-spacing:-0.01em">Risk profile</span>
        <span style="font-size:12px;color:var(--t3)">{view.windowNote}</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="display:inline-flex;align-items:center;gap:7px;height:28px;padding:0 10px;border:1px solid var(--line);border-radius:999px;background:var(--card);font-size:11px;color:var(--t2);white-space:nowrap">
          <span style="width:6px;height:6px;border-radius:50%;background:var(--grey-series)"></span>{view.riskFreeNote}
        </span>
        <span style="display:inline-flex;align-items:center;gap:7px;height:28px;padding:0 10px;border:1px solid var(--line);border-radius:999px;background:var(--card);font-size:11px;color:var(--t2);white-space:nowrap">
          <span style="width:6px;height:6px;border-radius:2px;background:var(--grey-series)"></span>{view.benchSourceNote}
        </span>
        <div style="position:relative">
          <button onclick={view.togDisplay} style="display:inline-flex;align-items:center;gap:7px;height:28px;padding:0 11px;border:1px solid var(--line);border-radius:999px;background:{view.displayBg};color:{view.displayFg};font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8h10M18 8h2M4 16h4M12 16h8"></path><circle cx="16" cy="8" r="2"></circle><circle cx="10" cy="16" r="2"></circle></svg>
            Display
          </button>
          {#if view.mDisplay}
            <div style="position:absolute;top:36px;right:0;z-index:50;width:268px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px;animation:menuIn .12s ease-out">
              <span style="display:block;padding:7px 10px 6px;font-size:11px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:var(--t3)">Gauge display</span>
              {#each view.displayRows as r}
                <button onclick={r.onClick} style="display:flex;align-items:flex-start;gap:10px;width:100%;padding:9px 10px;border:none;border-radius:6px;background:transparent;text-align:left;cursor:pointer" class="hover1">
                  <span style="flex:none;width:15px;height:15px;margin-top:1px;border:1px solid {r.boxBorder};border-radius:4px;background:{r.boxBg};display:flex;align-items:center;justify-content:center">
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="{r.tick}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5l2.6 2.5L10 3.5"></path></svg>
                  </span>
                  <span style="display:flex;flex-direction:column;gap:2px;min-width:0">
                    <span style="font-size:12.5px;font-weight:500;color:var(--t1)">{r.label}</span>
                    <span style="font-size:11px;line-height:1.45;color:var(--t3)">{r.hint}</span>
                  </span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div data-r="grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px">
      {#each view.gaugeCards as c}
        <div style="display:flex;flex-direction:column;gap:16px;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:20px">
          <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;position:relative">
              <span style="font-size:14px;font-weight:600;color:var(--t1);border-bottom:1px dotted var(--t3);line-height:1.4">{c.title}</span>
              <span onmouseenter={c.tipOn} onmouseleave={c.tipOff} style="width:14px;height:14px;flex:none;border:1px solid var(--line);border-radius:50%;font-size:9px;font-weight:500;color:var(--t3);display:flex;align-items:center;justify-content:center;cursor:help" class="hover2" role="button" tabindex="0" onfocus={c.tipOn} onclick={c.tipOn} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); c.tipOn(event); } }} onblur={c.tipOff}>?</span>
              {#if c.showTip}
                <span style="position:absolute;top:24px;left:0;z-index:30;width:262px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:10px 12px;font-size:11px;line-height:1.55;color:var(--t2);pointer-events:none">{c.tip}</span>
              {/if}
            </div>
            <span style="font-size:12px;line-height:1.55;color:var(--t2)">{c.explain}</span>
          </div>
          <NumberLineGauge min={c.min} max={c.max} minLabel={c.minLabel} maxLabel={c.maxLabel} tickValues={c.ticks} markers={c.markers} statement={c.statement} verdict={c.verdict} verdictTone={c.verdictTone} note={c.note} />
        </div>
      {/each}
    </div>
  </main></div>

<style>
:global(html[data-theme="dark"]) { --track:#3A3431; --tick:#4E4642; }
:global(:root) { --chip-bg:var(--hover); --track:#E4E1DF; --tick:#CFCAC6; }
.hover0:hover{background:var(--hover)}
.hover1:hover{background:var(--hover)}
.hover2:hover{border-color:var(--t3);color:var(--t2)}
@media (max-width:1100px){
      [data-r="twr"]{grid-template-columns:minmax(0,1fr)!important}
    }
    @media (max-width:960px){
      
      
      
      [data-r="main"]{padding:16px 16px 104px!important}
      
      [data-r="grid"]{grid-template-columns:minmax(0,1fr)!important}
    }
  
</style>
