<script lang="ts">
  import { untrack } from "svelte";
  import Model from "$lib/presenters/Screener";
  import Metric from "$lib/components/Metric.svelte";
  import TopNav from "$lib/components/TopNav.svelte";
  let { engine }: { engine: any } = $props();
  const model = $derived(new Model(engine));
  const view: any = $derived.by(() => { model.revision; return model.renderVals(); });
  $effect(() => { const current = model; untrack(() => current.componentDidMount?.()); return () => current.componentWillUnmount?.(); });
</script>


<div style="min-height:100vh;background:var(--canvas);color:var(--t1);font-size:14px;line-height:1.45">

  <TopNav active="Tools" subActive="Top dividend stocks" portfolioName={engine.constants.portfolioName} holdingsCount={engine.totals().holdings} />

  <main data-r="main" data-screen-label="Tools — Top dividend stocks" style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:18px">

    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap">
      <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;position:relative">
          <h1 style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)">Top dividend stocks</h1>
          <span onmouseenter={view.titleTipOn} onmouseleave={view.titleTipOff} style="width:16px;height:16px;margin-top:6px;flex:none;border:1px solid var(--line);border-radius:50%;font-size:10px;font-weight:500;color:var(--t3);display:flex;align-items:center;justify-content:center;cursor:help" class="hover0" role="button" tabindex="0" onfocus={view.titleTipOn} onclick={view.titleTipOn} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); view.titleTipOn(event); } }} onblur={view.titleTipOff}>?</span>
          {#if view.titleTip}
            <span style="position:absolute;top:44px;left:0;z-index:40;width:370px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:10px 12px;font-size:11.5px;line-height:1.55;color:var(--t2)">{view.titleTipText}</span>
          {/if}
          <span style="font-size:13px;color:var(--t3);padding-top:6px">{view.universeLabel}</span>
        </div>
        <span style="font-size:12px;color:var(--t3)">{view.headNote}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <button onclick={view.togWatchOnly} style="display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 13px;border:1px solid {view.watchBorder};border-radius:7px;background:{view.watchBg};color:{view.watchFg};font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="{view.watchFill}" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.6l2.6 5.5 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 10l6-.9z"></path></svg>
          {view.watchLabel}
        </button>
        <a href="/portfolio/holdings" style="display:inline-flex;align-items:center;height:32px;padding:0 13px;border:1px solid var(--line);border-radius:7px;color:var(--t1);font-size:12.5px;font-weight:500;text-decoration:none;white-space:nowrap" class="hover2">My holdings</a>
      </div>
    </div>

    <div data-r="stats" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
      {#each view.stats as s}
        <div style="padding:16px 20px;border-left:{s.border}">
          <Metric label={s.label} primary={s.primary} primaryTone={s.tone} secondary={s.secondary} secondaryNote={s.note} tip={s.tip} help={true} />
        </div>
      {/each}
    </div>

    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px 16px">
      <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">
        {#each view.numFilters as f}
          <span style="display:flex;flex-direction:column;gap:6px">
            <span style="font-size:11.5px;font-weight:500;color:var(--t2);white-space:nowrap">{f.label}</span>
            <span style="display:flex;align-items:stretch;width:{f.w};border:1px solid {f.border};border-radius:7px;overflow:hidden">
              {#if f.prefix}
                <span style="display:flex;align-items:center;padding:0 2px 0 9px;font-size:12.5px;color:var(--t3)">{f.prefix}</span>
              {/if}
              <input value="{f.value}" oninput={f.onChange} inputmode="decimal" placeholder="{f.placeholder}" style="flex:1;min-width:0;height:30px;padding:0 4px 0 9px;border:none;background:transparent;color:var(--t1);font-size:12.5px;outline:none">
              {#if f.suffix}
                <span style="display:flex;align-items:center;padding:0 9px 0 2px;font-size:12.5px;color:var(--t3)">{f.suffix}</span>
              {/if}
            </span>
          </span>
        {/each}

        <span style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:11.5px;font-weight:500;color:var(--t2)">Sector</span>
          <div style="position:relative">
            <button onclick={view.togSector} style="display:flex;align-items:center;justify-content:space-between;gap:10px;width:184px;height:32px;padding:0 11px;border:1px solid {view.sectorBorder};border-radius:7px;background:{view.sectorBg};color:var(--t1);font-size:12.5px;font-weight:500;cursor:pointer" class="hover3">
              <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{view.sectorLabel}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" style="color:var(--t3);flex:none"><path d="M6 9l6 6 6-6"></path></svg>
            </button>
            {#if view.mSector}
              <div style="position:absolute;top:36px;left:0;z-index:50;width:236px;max-height:300px;overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px;animation:menuIn .12s ease-out">
                {#each view.sectorOptions as o}
                  <button onclick={o.onClick} style="display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:8px 10px;border:none;border-radius:6px;background:{o.bg};text-align:left;cursor:pointer;font-size:12.5px;color:{o.color};font-weight:{o.weight}" class="hover4">
                    <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{o.label}</span>
                    <span style="font-size:11px;color:var(--t3)">{o.meta}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </span>

        <button onclick={view.togHide} style="display:flex;align-items:center;gap:8px;height:32px;padding:0 11px 0 9px;border:1px solid {view.hideBorder};border-radius:7px;background:{view.hideBg};color:var(--t1);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover5">
          <span style="width:15px;height:15px;flex:none;border:1px solid {view.hideBoxBorder};border-radius:4px;background:{view.hideBoxBg};display:flex;align-items:center;justify-content:center;color:var(--on-accent);font-size:10px;font-weight:700">{view.hideMark}</span>
          Hide what I own
        </button>

        {#if view.filtered}
          <button onclick={view.reset} style="height:32px;padding:0 11px;border:none;border-radius:7px;background:transparent;color:var(--t2);font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover6">Reset filters</button>
        {/if}
      </div>

      <span style="display:flex;align-items:center;gap:7px;height:32px;padding:0 11px;border:1px solid var(--line);border-radius:7px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M16.6 16.6L21 21"></path></svg>
        <input value="{view.query}" oninput={view.onQuery} placeholder="Ticker, name or sector…" style="width:196px;border:none;background:transparent;color:var(--t1);font-size:12.5px;outline:none">
      </span>
    </div>

    <div style="display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:12px 16px;border-bottom:1px solid var(--line)">
        <span style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:600;color:var(--t1)">{view.resultLabel}</span>
          <span style="font-size:11.5px;color:var(--t3)">{view.sortLabel}</span>
        </span>
        <span style="display:flex;align-items:center;gap:13px;flex-wrap:wrap">
          {#each view.badgeLegend as l}
            <span style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t3);white-space:nowrap">
              <span style="display:inline-flex;align-items:center;height:17px;padding:0 6px;border-radius:4px;background:{l.bg};color:{l.fg};font-size:10px;font-weight:600">{l.chip}</span>{l.label}
            </span>
          {/each}
        </span>
      </div>

      <div style="max-width:100%;overflow-x:auto;overscroll-behavior-x:contain">
        <div data-r="uwrap">
          <div style="display:grid;grid-template-columns:{view.cols};border-bottom:1px solid var(--line);background:var(--card)">
            {#each view.head as h}
              <div onclick={h.onClick} style="display:flex;align-items:center;justify-content:{h.justify};gap:5px;padding:9px 13px;cursor:{h.cursor};position:{h.pos};left:0;z-index:{h.z};background:var(--card)" class="hover7" role="button" tabindex="0" onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); h.onClick(event); } }}>
                <span style="font-size:12px;font-weight:{h.weight};color:{h.color};white-space:nowrap">{h.label}</span>
                {#if h.arrow}
                  <span style="font-size:9px;color:var(--accent)">{h.arrow}</span>
                {/if}
              </div>
            {/each}
          </div>

          {#each view.rows as r}
            <div onmouseenter={r.onEnter} onmouseleave={r.onLeave} style="display:grid;grid-template-columns:{view.cols};border-bottom:1px solid var(--line);background:{r.bg};border-left:{r.mark}" role="button" tabindex="0" onfocus={r.onEnter} onclick={r.onEnter} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); r.onEnter(event); } }} onblur={r.onLeave}>
              <div style="display:flex;align-items:center;gap:9px;padding:10px 13px;min-width:0;position:sticky;left:0;z-index:1;background:{r.bg}">
                <span style="width:26px;height:26px;flex:none;border-radius:6px;background:var(--hover);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:600;color:var(--t2)">{r.mono}</span>
                <span style="display:flex;flex-direction:column;gap:2px;min-width:0;flex:1">
                  <span style="display:flex;align-items:center;gap:6px;min-width:0">
                    <span style="font-size:13px;font-weight:500;color:var(--t1);white-space:nowrap">{r.ticker}</span>
                    {#if r.badge}
                      <span style="display:inline-flex;align-items:center;height:16px;padding:0 6px;border-radius:4px;background:{r.badgeBg};color:{r.badgeFg};font-size:9.5px;font-weight:600;white-space:nowrap">{r.badge}</span>
                    {/if}
                  </span>
                  <span style="font-size:12px;color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">{r.name}</span>
                </span>
              </div>
              {#each r.cells as c}
                <div style="display:flex;flex-direction:column;align-items:{c.items};justify-content:center;gap:2px;padding:10px 13px;min-width:0;overflow:hidden">
                  <span style="font-size:13px;font-weight:{c.weight};color:{c.color};white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis">{c.text}</span>
                  {#if c.sub}
                    <span style="font-size:11px;color:var(--t3);white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis">{c.sub}</span>
                  {/if}
                </div>
              {/each}
              <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:10px 13px;min-width:0">
                <span style="min-width:34px;text-align:center;font-size:12px;font-weight:600;color:{r.scoreColor};background:var(--chip-bg);border:1px solid var(--line);border-radius:5px;padding:3px 0">{r.score}</span>
                <span style="font-size:12px;color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{r.scoreLabel}</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:center;padding:10px 4px">
                <button onclick={r.onStar} title="{r.starTitle}" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;border-radius:6px;background:transparent;color:{r.starColor};cursor:pointer" class="hover8">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="{r.starFill}" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3.6l2.6 5.5 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 10l6-.9z"></path></svg>
                </button>
              </div>
            </div>
          {/each}

          {#if view.noResults}
            <div style="display:flex;flex-direction:column;align-items:center;gap:7px;padding:56px 20px">
              <span style="font-size:13.5px;font-weight:500;color:var(--t1)">Nothing clears these filters</span>
              <span style="font-size:12px;color:var(--t3);text-align:center;max-width:440px;line-height:1.6">{view.noResultsNote}</span>
              <button onclick={view.reset} style="margin-top:6px;height:30px;padding:0 12px;border:1px solid var(--line);border-radius:7px;background:transparent;font-size:12px;font-weight:500;color:var(--t1);cursor:pointer" class="hover9">Reset filters</button>
            </div>
          {/if}
        </div>
      </div>

      {#if view.hasMore}
        <div style="display:flex;align-items:center;justify-content:center;padding:12px 16px;border-top:1px solid var(--line)">
          <button onclick={view.showMore} style="height:30px;padding:0 14px;border:1px solid var(--line);border-radius:7px;background:transparent;font-size:12px;font-weight:500;color:var(--t1);cursor:pointer" class="hover10">{view.moreLabel}</button>
        </div>
      {/if}
    </div>

    <span style="font-size:11px;line-height:1.55;color:var(--t3);max-width:960px;text-wrap:pretty">{view.footnote}</span>
  </main>

  {#if view.toast}
    <div style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:95;display:flex;align-items:center;gap:9px;padding:11px 16px;background:var(--card);border:1px solid var(--line);border-radius:999px;box-shadow:var(--shadow)">
      <span style="width:7px;height:7px;border-radius:50%;background:var(--accent)"></span>
      <span style="font-size:12.5px;color:var(--t1)">{view.toast}</span>
    </div>
  {/if}</div>

<style>
:global(html[data-theme="dark"]) { --chip-bg:var(--hover); --track:#3A3431; }
:global(:root) { --chip-bg:var(--hover); --track:#E4E1DF; }
.hover0:hover{border-color:var(--t3);color:var(--t2)}
.hover1:hover{background:var(--hover)}
.hover2:hover{background:var(--hover);text-decoration:none}
.hover3:hover{background:var(--hover)}
.hover4:hover{background:var(--hover)}
.hover5:hover{background:var(--hover)}
.hover6:hover{background:var(--hover);color:var(--t1)}
.hover7:hover{background:var(--hover)}
.hover8:hover{background:var(--hover)}
.hover9:hover{background:var(--hover)}
.hover10:hover{background:var(--hover)}
@media (max-width:1240px){[data-r="uwrap"]{min-width:1140px}}
    @media (max-width:1080px){[data-r="stats"]{grid-template-columns:1fr 1fr!important}}
    @media (max-width:960px){
      
      
      
      [data-r="main"]{padding:16px 16px 104px!important}
    }
  
</style>
