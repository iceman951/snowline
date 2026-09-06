<script lang="ts">
  import { untrack } from "svelte";
  import Model from "$lib/presenters/FindTheDip";
  import Metric from "$lib/components/Metric.svelte";
  import TopNav from "$lib/components/TopNav.svelte";
  import TwoLineCell from "$lib/components/TwoLineCell.svelte";
  let { engine }: { engine: any } = $props();
  const model = $derived(new Model(engine));
  const view: any = $derived.by(() => { model.revision; return model.renderVals(); });
  $effect(() => { const current = model; untrack(() => current.componentDidMount?.()); return () => current.componentWillUnmount?.(); });
</script>


<div style="min-height:100vh;background:var(--canvas);color:var(--t1);font-size:14px;line-height:1.45">

  <TopNav active="Tools" subActive="Find the Dip" portfolioName={engine.constants.portfolioName} holdingsCount={engine.totals().holdings} />

  <main data-r="main" data-screen-label="Tools — Find the Dip" style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:18px">

    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap">
      <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;position:relative">
          <h1 style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)">Find the Dip</h1>
          <span onmouseenter={view.tipOn} onmouseleave={view.tipOff} style="width:16px;height:16px;margin-top:6px;flex:none;border:1px solid var(--line);border-radius:50%;font-size:10px;font-weight:500;color:var(--t3);display:flex;align-items:center;justify-content:center;cursor:help" class="hover0" role="button" tabindex="0" onfocus={view.tipOn} onclick={view.tipOn} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); view.tipOn(event); } }} onblur={view.tipOff}>?</span>
          {#if view.titleTip}
            <span style="position:absolute;top:44px;left:0;z-index:40;width:400px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:10px 12px;font-size:11.5px;line-height:1.55;color:var(--t2)">{view.titleTipText}</span>
          {/if}
          <span style="font-size:13px;color:var(--t3);padding-top:6px">{view.portfolioName}</span>
        </div>
        <span style="font-size:12px;color:var(--t3)">{view.headNote}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <a href="/tools/screener" style="display:inline-flex;align-items:center;height:32px;padding:0 13px;border:1px solid var(--line);border-radius:7px;color:var(--t1);font-size:12.5px;font-weight:500;text-decoration:none;white-space:nowrap" class="hover1">Screener</a>
        <a href="/portfolio/holdings" style="display:inline-flex;align-items:center;height:32px;padding:0 13px;border:1px solid var(--line);border-radius:7px;color:var(--t1);font-size:12.5px;font-weight:500;text-decoration:none;white-space:nowrap" class="hover2">My holdings</a>
      </div>
    </div>

    <div data-r="stats" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
      {#each view.stats as s}
        <div style="padding:16px 18px;border-left:{s.border}">
          <Metric label={s.label} primary={s.primary} primaryTone={s.tone} secondary={s.secondary} secondaryNote={s.note} tip={s.tip} help={true} />
        </div>
      {/each}
    </div>

    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:11px 14px">
      <span style="display:flex;align-items:center;gap:8px">
        <span style="font-size:12px;font-weight:500;color:var(--t2);white-space:nowrap">Off the high by</span>
        <span style="display:flex;align-items:center;gap:0;border:1px solid var(--line);border-radius:7px;overflow:hidden">
          {#each view.depthTabs as d}
            <button onclick={d.onClick} style="height:30px;padding:0 11px;border:none;border-left:{d.divider};background:{d.bg};color:{d.color};font-size:12px;font-weight:{d.weight};cursor:pointer;white-space:nowrap" class="hover3">{d.label}</button>
          {/each}
        </span>
      </span>

      <span style="display:flex;align-items:center;gap:8px">
        <span style="font-size:12px;font-weight:500;color:var(--t2);white-space:nowrap">Show</span>
        <span style="display:flex;align-items:center;gap:0;border:1px solid var(--line);border-radius:7px;overflow:hidden">
          {#each view.scopeTabs as d}
            <button onclick={d.onClick} style="height:30px;padding:0 11px;border:none;border-left:{d.divider};background:{d.bg};color:{d.color};font-size:12px;font-weight:{d.weight};cursor:pointer;white-space:nowrap" class="hover4">{d.label}</button>
          {/each}
        </span>
      </span>

      <span style="position:relative">
        <button onclick={view.togSector} style="display:flex;align-items:center;gap:8px;height:30px;padding:0 11px;border:1px solid {view.sectorBorder};border-radius:7px;background:transparent;color:var(--t1);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover5">
          {view.sectorLabel}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"></path></svg>
        </button>
        {#if view.sectorOpen}
          <span style="position:absolute;top:36px;left:0;z-index:60;display:block;width:230px;max-height:300px;overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:5px;animation:menuIn .12s ease-out">
            {#each view.sectorOptions as o}
              <button onclick={o.onClick} style="display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;height:32px;padding:0 9px;border:none;border-radius:6px;background:{o.bg};color:{o.color};font-size:12.5px;font-weight:{o.weight};cursor:pointer;text-align:left" class="hover6">
                <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{o.label}</span>
                <span style="font-size:11px;color:var(--t3)">{o.count}</span>
              </button>
            {/each}
          </span>
        {/if}
      </span>

      <button onclick={view.togBelow200} style="display:flex;align-items:center;gap:8px;height:30px;padding:0 11px 0 9px;border:1px solid {view.belowBorder};border-radius:7px;background:{view.belowBg};color:var(--t1);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover7">
        <span style="width:15px;height:15px;flex:none;border:1px solid {view.belowBoxBorder};border-radius:4px;background:{view.belowBoxBg};display:flex;align-items:center;justify-content:center;color:var(--on-accent);font-size:10px;font-weight:700">{view.belowMark}</span>
        Below the 200-day only
      </button>

      <input value="{view.query}" oninput={view.onQuery} placeholder="Ticker or name…" style="width:170px;height:30px;padding:0 11px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--t1);font-size:12.5px;outline:none">

      <div style="flex:1"></div>
      <span style="font-size:12px;color:var(--t3);white-space:nowrap">{view.resultLabel}</span>
      {#if view.filtered}
        <button onclick={view.onReset} style="height:30px;padding:0 11px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--t2);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover8">Clear filters</button>
      {/if}
    </div>

    <div style="display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
      <div style="max-width:100%;overflow-x:auto;overscroll-behavior-x:contain">
        <div style="min-width:1240px">
          <div style="display:grid;grid-template-columns:{view.cols};border-bottom:1px solid var(--line);background:var(--card)">
            {#each view.head as h}
              <div onclick={h.onClick} style="display:flex;align-items:center;justify-content:{h.justify};gap:5px;padding:9px 13px;cursor:{h.cursor};position:{h.pos};left:0;z-index:{h.z};background:var(--card)" class="hover9" role="button" tabindex="0" onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); h.onClick(event); } }}>
                <span style="font-size:12px;font-weight:{h.weight};color:{h.color};white-space:nowrap">{h.label}</span>
                {#if h.arrow}
                  <span style="font-size:9px;color:var(--accent)">{h.arrow}</span>
                {/if}
              </div>
            {/each}
          </div>

          {#each view.rows as r}
            <div onmouseenter={r.onEnter} onmouseleave={r.onLeave} style="display:grid;grid-template-columns:{view.cols};border-bottom:1px solid var(--line);background:{r.bg};border-left:{r.mark}" role="button" tabindex="0" onfocus={r.onEnter} onclick={r.onEnter} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); r.onEnter(event); } }} onblur={r.onLeave}>
              <div style="display:flex;align-items:center;gap:9px;padding:11px 13px;min-width:0;position:sticky;left:0;z-index:1;background:{r.bg}">
                <button onclick={r.onStar} title="{r.starTitle}" style="width:24px;height:24px;flex:none;display:flex;align-items:center;justify-content:center;border:none;border-radius:6px;background:transparent;cursor:pointer" class="hover10">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="{r.starFill}" stroke="{r.starColor}" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.6l2.6 5.5 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.3-4.2 6-.9 2.6-5.5Z"></path></svg>
                </button>
                <span style="width:26px;height:26px;flex:none;border-radius:6px;background:var(--hover);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:600;color:var(--t2)">{r.mono}</span>
                <a href="{r.href}" title="{r.hrefTitle}" style="display:flex;flex-direction:column;gap:1px;min-width:0;flex:1;text-decoration:none" class="hover11">
                  <span style="display:flex;align-items:center;gap:6px;min-width:0">
                    <span style="font-size:12.5px;font-weight:500;color:var(--t1);white-space:nowrap">{r.ticker}</span>
                    {#if r.tag}
                      <span style="display:inline-flex;align-items:center;height:16px;padding:0 6px;border-radius:4px;background:{r.tagBg};color:{r.tagFg};font-size:9.5px;font-weight:600;white-space:nowrap">{r.tag}</span>
                    {/if}
                  </span>
                  <span style="font-size:10.5px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{r.name}</span>
                </a>
              </div>

              <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 13px;min-width:0">
                <TwoLineCell primary={r.price} secondary={r.priceSub} tone={r.priceTone} align="right" />
              </div>

              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;padding:11px 13px;min-width:0">
                <TwoLineCell primary={r.fromHigh} secondary={r.highSub} tone={r.highTone} align="right" />
                {#if view.showRange}
                  <span style="position:relative;display:block;width:100%;height:3px;border-radius:2px;background:var(--track)">
                    <span style="position:absolute;top:0;bottom:0;left:0;width:{r.rangePos};border-radius:2px;background:{r.rangeColor}"></span>
                    <span style="position:absolute;top:-2px;left:{r.rangePos};transform:translateX(-50%);width:2px;height:7px;border-radius:1px;background:var(--t2)"></span>
                  </span>
                {/if}
              </div>

              <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 13px;min-width:0">
                <TwoLineCell primary={r.from50} secondary={r.ma50} tone={r.tone50} align="right" />
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 13px;min-width:0">
                <TwoLineCell primary={r.from200} secondary={r.ma200} tone={r.tone200} align="right" />
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 13px;min-width:0">
                <TwoLineCell primary={r.yield} secondary={r.yieldSub} align="right" />
              </div>
              <div style="display:flex;align-items:center;padding:11px 13px;min-width:0;overflow:hidden">
                <span style="display:block;min-width:0;flex:1;overflow:hidden">
                  <TwoLineCell primary={r.sector} secondary={r.sectorSub} align="left" />
                </span>
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 13px;min-width:0">
                <TwoLineCell primary={r.held} secondary={r.heldSub} tone={r.heldTone} align="right" />
              </div>
            </div>
          {/each}

          {#if view.noResults}
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:52px 24px">
              <span style="font-size:13.5px;font-weight:500;color:var(--t1)">Nothing is down that far</span>
              <span style="font-size:12px;color:var(--t3);text-align:center;max-width:460px;line-height:1.6">{view.noResultsNote}</span>
            </div>
          {/if}

          {#if view.hasMore}
            <div style="display:flex;align-items:center;justify-content:center;padding:12px">
              <button onclick={view.onMore} style="height:32px;padding:0 14px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--t1);font-size:12.5px;font-weight:500;cursor:pointer" class="hover12">{view.moreLabel}</button>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <span style="font-size:11px;line-height:1.55;color:var(--t3);max-width:1000px;text-wrap:pretty">{view.footnote}</span>
  </main>

  {#if view.toast}
    <div style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:80;padding:9px 15px;border-radius:8px;background:var(--t1);color:var(--canvas);font-size:12.5px;font-weight:500;box-shadow:var(--shadow)">{view.toast}</div>
  {/if}</div>

<style>
:global(html[data-theme="dark"]) { --track:#3A3431; }
:global(:root) { --track:#E4E1DF; }
.hover0:hover{border-color:var(--t3);color:var(--t2)}
.hover1:hover{background:var(--hover);text-decoration:none}
.hover2:hover{background:var(--hover);text-decoration:none}
.hover3:hover{background:var(--hover)}
.hover4:hover{background:var(--hover)}
.hover5:hover{background:var(--hover)}
.hover6:hover{background:var(--hover)}
.hover7:hover{background:var(--hover)}
.hover8:hover{background:var(--hover);color:var(--t1)}
.hover9:hover{background:var(--hover)}
.hover10:hover{background:var(--hover)}
.hover11:hover{text-decoration:none}
.hover12:hover{background:var(--hover)}
@media (max-width:1080px){[data-r="stats"]{grid-template-columns:1fr 1fr!important}}
    @media (max-width:960px){
      
      [data-r="main"]{padding:16px 16px 104px!important}
    }
  
</style>
