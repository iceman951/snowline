<script lang="ts">
  import { untrack } from "svelte";
  import Model from "$lib/presenters/Growth";
  import AnalyticsSubnav from "$lib/components/AnalyticsSubnav.svelte";
  import ChartTooltip from "$lib/components/ChartTooltip.svelte";
  import RangeTabs from "$lib/components/RangeTabs.svelte";
  import TopNav from "$lib/components/TopNav.svelte";
  import TwoLineCell from "$lib/components/TwoLineCell.svelte";
  let { engine }: { engine: any } = $props();
  const model = $derived(new Model(engine));
  const view: any = $derived.by(() => { model.revision; return model.renderVals(); });
  $effect(() => { const current = model; untrack(() => current.componentDidMount?.()); return () => current.componentWillUnmount?.(); });
</script>


<div style="min-height:100vh;background:var(--canvas);color:var(--t1);font-size:14px;line-height:1.45">

  <TopNav active="Analytics" subActive="Growth" portfolioName={engine.constants.portfolioName} holdingsCount={engine.totals().holdings} />

  <main data-r="main" data-screen-label="Analytics — Growth" style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:22px">

    <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
      <div style="display:flex;align-items:center;gap:9px">
        <h1 style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)">Growth</h1>
        <span style="font-size:13px;color:var(--t3);padding-top:6px">{view.portfolioName}</span>
      </div>
      <div style="display:flex;align-items:center;gap:9px;font-size:12px;color:var(--t3)">
        <span>{view.headSpan}</span>
        <span style="width:1px;height:10px;background:var(--line)"></span>
        <span>{view.headTwr}</span>
      </div>
    </div>

    <AnalyticsSubnav active="Growth" />

    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:11px 16px;background:var(--card);border:1px solid var(--line);border-radius:8px">
      <span style="font-size:12px;font-weight:500;color:var(--t2)">Benchmarks</span>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        {#each view.benchChips as b}
          <button onclick={b.onClick} style="display:flex;align-items:center;gap:7px;height:28px;padding:0 10px;border:1px solid {b.border};border-radius:999px;background:{b.bg};color:{b.color};font-size:12px;font-weight:500;cursor:pointer" class="hover0">
            <span style="width:7px;height:7px;border-radius:2px;background:{b.dot}"></span>
            {b.label}
          </button>
        {/each}
      </div>
      <div style="position:relative">
        <button onclick={view.togBench} style="display:flex;align-items:center;gap:7px;height:28px;padding:0 11px;border:1px dashed var(--line);border-radius:999px;background:transparent;color:var(--t2);font-size:12px;cursor:pointer" class="hover1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>
          Select
        </button>
        {#if view.mBench}
          <div style="position:absolute;top:34px;left:0;z-index:50;width:236px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px;animation:menuIn .12s ease-out">
            {#each view.benchOptions as o}
              <button onclick={o.onClick} style="display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;height:40px;padding:0 10px;border:none;border-radius:6px;background:transparent;color:var(--t1);font-size:13px;cursor:pointer;text-align:left" class="hover2">
                <span style="display:flex;flex-direction:column;gap:1px">
                  <span>{o.label}</span>
                  <span style="font-size:11px;color:var(--t3)">{o.note}</span>
                </span>
                <span style="color:var(--accent);font-size:12px;opacity:{o.check}">✓</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <div style="flex:1"></div>
    </div>

    <div style="background:var(--card);border:1px solid var(--line);border-radius:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 20px;border-bottom:1px solid var(--line);flex-wrap:wrap">
        <span style="font-size:14px;font-weight:600;color:var(--t1)">Portfolio value</span>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="display:flex;flex-direction:column;gap:1px;text-align:right">
            <span style="font-size:12px;color:var(--t3)">{view.pvSpan}</span>
            <span style="font-size:13px;font-weight:500;color:{view.pvChangeColor}">{view.pvChange}</span>
          </div>
          <RangeTabs value={view.pvRange} onChange={view.setPvRange} />
        </div>
      </div>
      <div style="padding:18px 20px 20px;display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;align-items:center;gap:16px">
          {#each view.pvLegend as l}
            <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t2)">
              <span style="width:12px;height:3px;border-radius:2px;background:{l.color};display:inline-block"></span>{l.label}
              <span style="color:var(--t3)">{l.value}</span>
            </span>
          {/each}
        </div>
        <div style="position:relative" onmouseleave={view.pvLeave} role="group">
          <svg role="img" aria-label="Portfolio history chart" viewBox="0 0 1000 260" preserveAspectRatio="none" style="width:100%;height:260px;display:block" onmousemove={view.pvMove}>
            <defs>
              <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.20"></stop>
                <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.02"></stop>
              </linearGradient>
            </defs>
            {#each view.pvGrid as g}
              <line x1="0" y1="{g.y}" x2="1000" y2="{g.y}" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 5" vector-effect="non-scaling-stroke"></line>
            {/each}
            <path d="{view.pvArea}" fill="url(#pvFill)"></path>
            <path d="{view.pvInvested}" fill="none" stroke="var(--grey-series)" stroke-width="1.6" stroke-dasharray="5 4" vector-effect="non-scaling-stroke" stroke-linejoin="round"></path>
            <path d="{view.pvLine}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"></path>
            {#if view.pvHover}
              <line x1="{view.pvCursorX}" y1="0" x2="{view.pvCursorX}" y2="260" stroke="var(--t3)" stroke-width="1" vector-effect="non-scaling-stroke"></line>
            {/if}
          </svg>
          {#if view.pvHover}
            <span style="position:absolute;left:{view.pvDotLeft};top:{view.pvDotTop};transform:translate(-50%,-50%);width:9px;height:9px;border-radius:50%;background:var(--accent);border:2px solid var(--card);pointer-events:none"></span>
            <span style="position:absolute;left:{view.pvDotLeft};top:{view.pvInvTop};transform:translate(-50%,-50%);width:7px;height:7px;border-radius:50%;background:var(--grey-series);border:2px solid var(--card);pointer-events:none"></span>
          {/if}
          {#each view.pvGrid as g}
            <span style="position:absolute;left:0;top:{g.top};transform:translateY(-50%);font-size:10px;color:var(--t3);background:var(--card);padding-right:5px;pointer-events:none">{g.label}</span>
          {/each}
          {#if view.pvTip}
            <div style="position:absolute;top:6px;left:{view.pvTipLeft};transform:translateX(-50%);z-index:9;pointer-events:none">
              <ChartTooltip tip={view.pvTip} />
            </div>
          {/if}
        </div>
        <div style="display:flex;justify-content:space-between">
          {#each view.pvXLabels as x}
            <span style="font-size:10px;color:var(--t3)">{x.label}</span>
          {/each}
        </div>
      </div>
    </div>

    <div style="background:var(--card);border:1px solid var(--line);border-radius:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 20px;border-bottom:1px solid var(--line);flex-wrap:wrap">
        <span style="font-size:14px;font-weight:600;color:var(--t1)">Portfolio performance</span>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="display:flex;flex-direction:column;gap:1px;text-align:right">
            <span style="font-size:12px;color:var(--t3)">{view.ppSpan}</span>
            <span style="font-size:13px;font-weight:500;color:{view.ppChangeColor}">{view.ppChange}</span>
          </div>
          <RangeTabs value={view.ppRange} onChange={view.setPpRange} />
        </div>
      </div>
      <div style="padding:18px 20px 20px;display:flex;flex-direction:column;gap:10px">
        <div style="position:relative" onmouseleave={view.ppLeave} role="group">
          <svg role="img" aria-label="Portfolio history chart" viewBox="0 0 1000 220" preserveAspectRatio="none" style="width:100%;height:220px;display:block" onmousemove={view.ppMove}>
            <defs>
              <linearGradient id="ppFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.22"></stop>
                <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.02"></stop>
              </linearGradient>
            </defs>
            {#each view.ppGrid as g}
              <line x1="0" y1="{g.y}" x2="1000" y2="{g.y}" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 5" vector-effect="non-scaling-stroke"></line>
            {/each}
            <line x1="0" y1="{view.ppZeroY}" x2="1000" y2="{view.ppZeroY}" stroke="var(--t3)" stroke-width="1" vector-effect="non-scaling-stroke"></line>
            <path d="{view.ppArea}" fill="url(#ppFill)"></path>
            <path d="{view.ppLine}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"></path>
            {#if view.ppHover}
              <line x1="{view.ppCursorX}" y1="0" x2="{view.ppCursorX}" y2="220" stroke="var(--t3)" stroke-width="1" vector-effect="non-scaling-stroke"></line>
            {/if}
          </svg>
          {#if view.ppHover}
            <span style="position:absolute;left:{view.ppDotLeft};top:{view.ppDotTop};transform:translate(-50%,-50%);width:9px;height:9px;border-radius:50%;background:var(--accent);border:2px solid var(--card);pointer-events:none"></span>
          {/if}
          {#each view.ppGrid as g}
            <span style="position:absolute;left:0;top:{g.top};transform:translateY(-50%);font-size:10px;color:var(--t3);background:var(--card);padding-right:5px;pointer-events:none">{g.label}</span>
          {/each}
          {#if view.ppTip}
            <div style="position:absolute;top:6px;left:{view.ppTipLeft};transform:translateX(-50%);z-index:9;pointer-events:none">
              <ChartTooltip tip={view.ppTip} />
            </div>
          {/if}
        </div>
        <div style="display:flex;justify-content:space-between">
          {#each view.ppXLabels as x}
            <span style="font-size:10px;color:var(--t3)">{x.label}</span>
          {/each}
        </div>
      </div>
    </div>

    <div style="background:var(--card);border:1px solid var(--line);border-radius:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 20px;border-bottom:1px solid var(--line);flex-wrap:wrap">
        <div style="display:flex;align-items:baseline;gap:10px">
          <span style="font-size:14px;font-weight:600;color:var(--t1)">Dynamics of portfolio returns</span>
          <span style="font-size:12px;color:var(--t3)">{view.dynSubtitle}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="display:flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--line);border-radius:8px">
            {#each view.dynPills as p}
              <button onclick={p.onClick} style="height:26px;padding:0 11px;border:none;border-radius:6px;background:{p.bg};color:{p.color};font-size:12px;font-weight:{p.weight};cursor:pointer" class="hover3">{p.label}</button>
            {/each}
          </div>
        </div>
      </div>
      <div style="padding:20px">
        <div style="position:relative">
          <svg viewBox="0 0 1000 230" preserveAspectRatio="none" style="width:100%;height:230px;display:block">
            {#each view.dynGrid as g}
              <line x1="44" y1="{g.y}" x2="994" y2="{g.y}" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 5" vector-effect="non-scaling-stroke"></line>
            {/each}
            <line x1="44" y1="{view.dynZeroY}" x2="994" y2="{view.dynZeroY}" stroke="var(--t3)" stroke-width="1" vector-effect="non-scaling-stroke"></line>
            {#each view.dynBars as b}
              <rect x="{b.x}" y="{b.y}" width="{b.w}" height="{b.h}" fill="{b.fill}" rx="1"></rect>
            {/each}
          </svg>
          {#each view.dynGrid as g}
            <span style="position:absolute;left:0;top:{g.top};transform:translateY(-50%);width:38px;text-align:right;font-size:10px;color:var(--t3);pointer-events:none">{g.label}</span>
          {/each}
          {#each view.dynBars as b}
            <span style="position:absolute;left:{b.labelLeft};top:{b.labelTop};transform:translate(-50%,-50%);font-size:10px;font-weight:500;color:{b.labelColor};white-space:nowrap;pointer-events:none">{b.pct}</span>
          {/each}
        </div>
        <div style="display:flex;margin-left:4.4%">
          {#each view.dynBars as b}
            <span style="flex:1;text-align:center;font-size:10px;color:var(--t3);white-space:nowrap;overflow:hidden">{b.label}</span>
          {/each}
        </div>
      </div>
    </div>

    <div style="background:var(--card);border:1px solid var(--line);border-radius:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 20px;border-bottom:1px solid var(--line);flex-wrap:wrap">
        <div style="display:flex;align-items:baseline;gap:10px">
          <span style="font-size:14px;font-weight:600;color:var(--t1)">Holdings performance</span>
          <span style="font-size:12px;color:var(--t3)">{view.hpSubtitle}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <RangeTabs value={view.hpRange} onChange={view.setHpRange} />
          <div style="display:flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--line);border-radius:8px">
            {#each view.hpViews as v}
              <button onclick={v.onClick} title="{v.title}" style="display:flex;align-items:center;justify-content:center;width:28px;height:26px;border:none;border-radius:6px;background:{v.bg};color:{v.color};cursor:pointer" class="hover4">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="{v.d}"></path></svg>
              </button>
            {/each}
          </div>
          <a href="/portfolio/holdings" style="font-size:12px;font-weight:500;white-space:nowrap">All holdings →</a>
        </div>
      </div>

      {#if view.hpIsChart}
        <div class="performance-bars" style="padding:20px;display:flex;flex-direction:column;gap:9px">
          {#each view.hpRows as r}
            <div onmouseenter={r.onEnter} onmouseleave={r.onLeave} style="position:relative;display:grid;grid-template-columns:76px minmax(0,1fr);gap:12px;align-items:center;padding:3px 6px;border-radius:6px;background:{r.bg}" role="button" tabindex="0" onfocus={r.onEnter} onclick={r.onEnter} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); r.onEnter(event); } }} onblur={r.onLeave}>
              <span style="font-size:12px;font-weight:500;color:var(--t1);white-space:nowrap">{r.ticker}</span>
              <span style="position:relative;display:block;height:22px">
                <span style="position:absolute;left:{r.zero};top:0;width:1px;height:22px;background:var(--line)"></span>
                <span style="position:absolute;left:{r.barLeft};top:3px;width:{r.barWidth};height:16px;border-radius:2px;background:{r.fill}"></span>
                <span style="position:absolute;left:{r.labelLeft};top:0;height:22px;display:flex;align-items:center;font-size:11px;font-weight:500;color:{r.labelColor};white-space:nowrap;padding:0 6px">{r.pct}</span>
              </span>
              {#if r.tip}
                <div style="position:absolute;top:24px;left:{r.tipLeft};z-index:12;pointer-events:none">
                  <ChartTooltip tip={r.tip} />
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      {#if view.hpIsTable}
        <div style="padding:6px 20px 20px">
          <div style="display:grid;grid-template-columns:minmax(0,1.4fr) repeat(5,minmax(0,1fr));gap:12px;padding:10px 0 9px;border-bottom:1px solid var(--line)">
            <span style="font-size:12px;font-weight:500;color:var(--t2)">Holding</span>
            <span style="font-size:12px;font-weight:500;color:var(--t2);text-align:right">Total profit</span>
            <span style="font-size:12px;font-weight:500;color:var(--t2);text-align:right">Capital gain</span>
            <span style="font-size:12px;font-weight:500;color:var(--t2);text-align:right">Dividends</span>
            <span style="font-size:12px;font-weight:500;color:var(--t2);text-align:right">Taxes</span>
            <span style="font-size:12px;font-weight:500;color:var(--t2);text-align:right">Fees paid</span>
          </div>
          {#each view.hpTableRows as r}
            <div style="display:grid;grid-template-columns:minmax(0,1.4fr) repeat(5,minmax(0,1fr));gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)">
              <span style="display:flex;align-items:center;gap:10px;min-width:0">
                <span style="width:26px;height:26px;flex:none;border-radius:6px;background:var(--hover);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:var(--t2)">{r.mono}</span>
                <span style="display:flex;flex-direction:column;gap:1px;min-width:0">
                  <span style="font-size:13px;font-weight:500;color:var(--t1)">{r.ticker}</span>
                  <span style="font-size:12px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{r.name}</span>
                </span>
              </span>
              <TwoLineCell align="right" primary={r.profit} secondary={r.profitPct} tone={r.tone} secondaryTone={r.tone} />
              <TwoLineCell align="right" primary={r.gain} secondary={r.gainPct} tone={r.gainTone} secondaryTone={r.gainTone} />
              <span style="font-size:13px;color:var(--t1);text-align:right">{r.dividends}</span>
              <span style="font-size:13px;color:var(--t2);text-align:right">{r.taxes}</span>
              <span style="font-size:13px;color:var(--t2);text-align:right">{r.fees}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </main></div>

<style>
:global(:root) { --chip-bg:var(--hover); }
.hover0:hover{border-color:var(--t3)}
.hover1:hover{border-color:var(--t3);color:var(--t1)}
.hover2:hover{background:var(--hover)}
.hover3:hover{background:var(--hover)}
.hover4:hover{background:var(--hover)}
@media (max-width:960px){
      
      
      
      [data-r="main"]{padding:16px 16px 104px!important}
      
    }
  
@media (max-width:620px) { .performance-bars { padding-right:76px!important; } }
</style>
