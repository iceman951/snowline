<script lang="ts">
  import { untrack } from "svelte";
  import Model from "$lib/presenters/Report";
  import AnalyticsSubnav from "$lib/components/AnalyticsSubnav.svelte";
  import ChartTooltip from "$lib/components/ChartTooltip.svelte";
  import TopNav from "$lib/components/TopNav.svelte";
  let { engine }: { engine: any } = $props();
  const model = $derived(new Model(engine));
  const view: any = $derived.by(() => { model.revision; return model.renderVals(); });
  $effect(() => { const current = model; untrack(() => current.componentDidMount?.()); return () => current.componentWillUnmount?.(); });
</script>


<div style="min-height:100vh;background:var(--canvas);color:var(--t1);font-size:14px;line-height:1.45">

  <TopNav active="Analytics" subActive="Report" portfolioName={engine.constants.portfolioName} holdingsCount={engine.totals().holdings} />

  <main data-r="main" data-screen-label="Analytics — Report" style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:22px">

    <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
      <div style="display:flex;align-items:center;gap:9px">
        <h1 style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)">Report</h1>
        <span style="font-size:13px;color:var(--t3);padding-top:6px">{view.portfolioName}</span>
      </div>
      <div style="display:flex;align-items:center;gap:9px;font-size:12px;color:var(--t3);flex-wrap:wrap">
        <span>{view.headSpan}</span>
        <span style="width:1px;height:10px;background:var(--line)"></span>
        <span>{view.headValue}</span>
      </div>
    </div>

    <AnalyticsSubnav active="Report" />

    <div style="display:flex;flex-direction:column;gap:0;background:var(--card);border:1px solid var(--line);border-radius:8px">

      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:16px 20px;border-bottom:1px solid var(--line)">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span style="font-size:12px;font-weight:500;color:var(--t2)">Benchmarks</span>
          <div style="position:relative">
            <button onclick={view.togBench} style="display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 11px;border:1px solid {view.benchBorder};border-radius:7px;background:{view.benchBg};color:var(--t1);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover0">
              {view.benchLabel}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--t3)"><path d="M6 9l6 6 6-6"></path></svg>
            </button>
            {#if view.mBench}
              <div style="position:absolute;top:38px;left:0;z-index:50;width:274px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px;animation:menuIn .12s ease-out">
                <span style="display:block;padding:7px 10px 6px;font-size:11px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:var(--t3)">Compare against</span>
                {#each view.benchRows as b}
                  <button onclick={b.onClick} style="display:flex;align-items:flex-start;gap:10px;width:100%;padding:9px 10px;border:none;border-radius:6px;background:transparent;text-align:left;cursor:{b.cursor};opacity:{b.opacity}" class="hover1">
                    <span style="flex:none;width:15px;height:15px;margin-top:1px;border:1px solid {b.boxBorder};border-radius:4px;background:{b.boxBg};display:flex;align-items:center;justify-content:center">
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="{b.tick}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5l2.6 2.5L10 3.5"></path></svg>
                    </span>
                    <span style="display:flex;flex-direction:column;gap:2px;min-width:0">
                      <span style="font-size:12.5px;font-weight:500;color:var(--t1)">{b.label}</span>
                      <span style="font-size:11px;line-height:1.45;color:var(--t3)">{b.hint}</span>
                    </span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span style="font-size:12px;color:var(--t3)">{view.hint}</span>
          {#if view.anySelected}
            <button onclick={view.clearAll} style="border:none;background:transparent;padding:0;font-size:12px;font-weight:500;color:var(--accent);cursor:pointer;text-decoration:underline;text-underline-offset:2px">Clear all</button>
          {/if}
        </div>
      </div>

      <div style="padding:18px 20px 16px;display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
          <span style="font-size:12px;font-weight:500;color:var(--t2)">{view.chartTitle}</span>
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
            {#each view.legend as l}
              <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t2);white-space:nowrap">
                <span style="width:12px;height:{l.h};border-radius:2px;background:{l.color}"></span>{l.label}
              </span>
            {/each}
          </div>
        </div>

        <div style="position:relative;display:flex;gap:10px">
          <div style="display:flex;flex-direction:column;justify-content:space-between;height:236px;padding:2px 0 0;flex:none">
            {#each view.yTicks as y}
              <span style="font-size:10px;color:var(--t3);text-align:right;line-height:1">{y.label}</span>
            {/each}
          </div>

          <div style="position:relative;flex:1;min-width:0">
            <div style="position:absolute;inset:0 0 20px 0;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none">
              {#each view.yTicks as y}
                <span style="height:1px;background:var(--line);opacity:{y.op};border-top:1px dashed var(--line)"></span>
              {/each}
            </div>

            <div style="position:relative;display:flex;align-items:flex-end;height:216px">
              {#each view.bars as b}
                <div onmouseenter={b.onEnter} onmouseleave={b.onLeave} style="flex:1;min-width:0;height:100%;display:flex;align-items:flex-end;justify-content:center;cursor:default;background:{b.slotBg}" role="button" tabindex="0" onfocus={b.onEnter} onclick={b.onEnter} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); b.onEnter(event); } }} onblur={b.onLeave}>
                  <span style="width:62%;max-width:44px;height:{b.h};background:{b.fill};display:block"></span>
                </div>
              {/each}
              {#if view.hasLines}
                <svg viewBox="0 0 1000 216" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:216px;pointer-events:none">
                  {#each view.lines as s}
                    <path d="{s.d}" fill="none" stroke="{s.color}" stroke-width="2" stroke-dasharray="{s.dash}" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"></path>
                  {/each}
                </svg>
              {/if}
            </div>

            <div style="display:flex;height:20px;align-items:center">
              {#each view.bars as b}
                <span style="flex:1;min-width:0;text-align:center;font-size:10px;color:var(--t3);white-space:nowrap;overflow:hidden">{b.tickLabel}</span>
              {/each}
            </div>

            {#if view.tip}
              <div style="position:absolute;top:0;left:{view.tipLeft};transform:translateX({view.tipShift});z-index:20;pointer-events:none">
                <ChartTooltip tip={view.tip} />
              </div>
            {/if}
          </div>

          {#if view.hasRightAxis}
            <div style="display:flex;flex-direction:column;justify-content:space-between;height:236px;padding:2px 0 0;flex:none">
              {#each view.rTicks as y}
                <span style="font-size:10px;color:var(--t3);line-height:1">{y.label}</span>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div data-r="toolbar" style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:14px 20px;border-top:1px solid var(--line);background:var(--canvas);border-radius:0 0 8px 8px">
        <div data-r="noprint" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          {#each view.exports as e}
            <button onclick={e.onClick} style="display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 13px;border:1px solid var(--line);border-radius:7px;background:var(--card);color:var(--t1);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="color:var(--t3)"><path d="M12 3v11m0 0l-4-4m4 4l4-4M4 17v3h16v-3"></path></svg>
              {e.label}
            </button>
          {/each}
          {#if view.toast}
            <span style="font-size:11px;color:var(--t2)">{view.toast}</span>
          {/if}
        </div>

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          {#each view.pickers as p}
            <div style="position:relative">
              <button onclick={p.onToggle} style="display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 12px;border:1px solid var(--line);border-radius:7px;background:{p.bg};font-size:12px;cursor:pointer;white-space:nowrap" class="hover3">
                <span style="color:var(--t3)">{p.title}</span>
                <span style="color:var(--t1);font-weight:500">{p.value}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--t3)"><path d="M6 9l6 6 6-6"></path></svg>
              </button>
              {#if p.open}
                <div style="position:absolute;top:40px;right:0;z-index:50;min-width:190px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px;animation:menuIn .12s ease-out">
                  {#each p.options as o}
                    <button onclick={o.onClick} style="display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:8px 10px;border:none;border-radius:6px;background:{o.bg};text-align:left;cursor:pointer;font-size:12.5px;color:{o.color};font-weight:{o.weight}" class="hover4">
                      {o.label}
                      <span style="font-size:11px;color:var(--t3)">{o.note}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div data-r="scroller" style="position:relative;max-width:100%;border:1px solid var(--line);border-radius:8px;background:var(--card);overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain">
      <div style="min-width:{view.minWidth}">

        <div style="display:grid;grid-template-columns:{view.gridCols};border-bottom:1px solid var(--line);background:var(--card)">
          <div style="position:sticky;left:0;z-index:3;background:var(--card);border-right:1px solid var(--line);display:flex;align-items:center;padding:11px 14px">
            <span style="font-size:12px;font-weight:500;color:var(--t2)">Metric</span>
          </div>
          {#each view.cols as c}
            <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 14px;background:{c.bg}">
              <span style="font-size:12px;font-weight:500;color:{c.color};white-space:nowrap">{c.label}</span>
            </div>
          {/each}
        </div>

        {#each view.freeRows as r}
          <div onclick={r.onClick} onmouseenter={r.onEnter} onmouseleave={r.onLeave} style="display:grid;grid-template-columns:{view.gridCols};border-bottom:1px solid var(--line);cursor:pointer;background:{r.bg}" role="button" tabindex="0" onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); r.onClick(event); } }} onfocus={r.onEnter} onblur={r.onLeave}>
            <div style="position:sticky;left:0;z-index:2;background:{r.bg};border-right:1px solid var(--line);border-left:3px solid {r.rule};display:flex;align-items:center;gap:9px;padding:10px 14px 10px 11px;min-width:0">
              <span style="width:9px;height:9px;flex:none;border-radius:2px;background:{r.dot};border:1px solid {r.dotBorder}"></span>
              <span style="font-size:13px;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{r.label}</span>
            </div>
            {#each r.cells as c}
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:10px 14px;background:{c.bg}">
                <span style="font-size:13px;color:{c.color};white-space:nowrap">{c.text}</span>
              </div>
            {/each}
          </div>
        {/each}

      </div>
    </div>

    <span style="font-size:11px;line-height:1.5;color:var(--t3)">{view.footnote}</span>
  </main></div>

<style>
:global(html[data-theme="dark"]) { --track:#3A3431; --tick:#4E4642; --veil:rgba(23,23,23,.70); }
:global(:root) { --track:#E4E1DF; --tick:#CFCAC6; --veil:rgba(255,255,255,.72); }
.hover0:hover{background:var(--hover)}
.hover1:hover{background:var(--hover)}
.hover2:hover{background:var(--hover)}
.hover3:hover{background:var(--hover)}
.hover4:hover{background:var(--hover)}
@media print{
      [data-r="noprint"]{display:none!important}
      [data-r="scroller"]{overflow:visible!important}
    }
    @media (max-width:960px){
      
      
      
      [data-r="main"]{padding:16px 16px 104px!important}
      [data-r="toolbar"]{flex-direction:column!important;align-items:stretch!important}
    }
  
</style>
