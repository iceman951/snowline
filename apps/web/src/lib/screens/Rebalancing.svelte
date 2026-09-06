<script lang="ts">
  import { untrack } from "svelte";
  import Model from "$lib/presenters/Rebalancing";
  import Metric from "$lib/components/Metric.svelte";
  import TopNav from "$lib/components/TopNav.svelte";
  import TwoLineCell from "$lib/components/TwoLineCell.svelte";
  let { engine }: { engine: any } = $props();
  const model = $derived(new Model(engine));
  const view: any = $derived.by(() => { model.revision; return model.renderVals(); });
  $effect(() => { const current = model; untrack(() => current.componentDidMount?.()); return () => current.componentWillUnmount?.(); });
</script>


<div style="min-height:100vh;background:var(--canvas);color:var(--t1);font-size:14px;line-height:1.45">

  <TopNav active="Tools" subActive="Portfolio rebalancing" portfolioName={engine.constants.portfolioName} holdingsCount={engine.totals().holdings} />

  <main data-r="main" data-screen-label="Tools — Portfolio rebalancing" style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:18px">

    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap">
      <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;position:relative">
          <h1 style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)">Portfolio rebalancing</h1>
          <span onmouseenter={view.titleTipOn} onmouseleave={view.titleTipOff} style="width:16px;height:16px;margin-top:6px;flex:none;border:1px solid var(--line);border-radius:50%;font-size:10px;font-weight:500;color:var(--t3);display:flex;align-items:center;justify-content:center;cursor:help" class="hover0" role="button" tabindex="0" onfocus={view.titleTipOn} onclick={view.titleTipOn} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); view.titleTipOn(event); } }} onblur={view.titleTipOff}>?</span>
          {#if view.titleTip}
            <span style="position:absolute;top:44px;left:0;z-index:40;width:370px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:10px 12px;font-size:11.5px;line-height:1.55;color:var(--t2)">{view.titleTipText}</span>
          {/if}
          <span style="font-size:13px;color:var(--t3);padding-top:6px">{view.portfolioName}</span>
        </div>
        <span style="font-size:12px;color:var(--t3)">{view.headNote}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <a href="/portfolio/categories" style="display:inline-flex;align-items:center;height:32px;padding:0 13px;border:1px solid var(--line);border-radius:7px;color:var(--t1);font-size:12.5px;font-weight:500;text-decoration:none;white-space:nowrap" class="hover1">Edit targets</a>
        <a href="/portfolio/cash" style="display:inline-flex;align-items:center;height:32px;padding:0 13px;border:1px solid var(--line);border-radius:7px;color:var(--t1);font-size:12.5px;font-weight:500;text-decoration:none;white-space:nowrap" class="hover2">Cash</a>
      </div>
    </div>

    <div data-r="stats" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
      {#each view.stats as s}
        <div style="padding:16px 20px;border-left:{s.border}">
          <Metric label={s.label} primary={s.primary} primaryTone={s.tone} secondary={s.secondary} secondaryNote={s.note} tip={s.tip} help={true} />
        </div>
      {/each}
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:13px 16px">
      <div style="display:flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--line);border-radius:8px">
        {#each view.modes as m}
          <button onclick={m.onClick} style="height:30px;padding:0 14px;border:none;border-radius:6px;background:{m.bg};color:{m.color};font-size:12.5px;font-weight:{m.weight};cursor:pointer;white-space:nowrap" class="hover3">{m.label}</button>
        {/each}
      </div>

      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        {#if view.isCash}
          <span style="display:flex;align-items:center;gap:9px">
            <span style="font-size:12px;font-weight:500;color:var(--t2);white-space:nowrap">New cash to invest</span>
            <span style="display:flex;align-items:stretch;width:132px;border:1px solid var(--accent);border-radius:7px;overflow:hidden">
              <span style="display:flex;align-items:center;padding:0 2px 0 10px;font-size:13px;color:var(--t3)">$</span>
              <input value="{view.cashDraft}" oninput={view.onCash} inputmode="decimal" style="flex:1;min-width:0;height:30px;padding:0 10px 0 3px;border:none;background:transparent;color:var(--t1);font-size:13px;font-weight:500;outline:none">
            </span>
          </span>
          <span style="display:flex;align-items:center;gap:6px">
            {#each view.cashPresets as p}
              <button onclick={p.onClick} style="height:26px;padding:0 9px;border:1px solid {p.border};border-radius:999px;background:{p.bg};color:{p.color};font-size:11.5px;font-weight:500;cursor:pointer" class="hover4">{p.label}</button>
            {/each}
          </span>
        {/if}

        {#if view.isNow}
          <button onclick={view.togSurplus} style="display:flex;align-items:center;gap:8px;height:30px;padding:0 11px 0 9px;border:1px solid {view.surplusBorder};border-radius:7px;background:{view.surplusBg};color:var(--t1);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover5">
            <span style="width:15px;height:15px;flex:none;border:1px solid {view.surplusBoxBorder};border-radius:4px;background:{view.surplusBoxBg};display:flex;align-items:center;justify-content:center;color:var(--on-accent);font-size:10px;font-weight:700">{view.surplusMark}</span>
            {view.surplusLabel}
          </button>
        {/if}

        <span style="display:flex;align-items:center;gap:9px">
          <span style="font-size:12px;font-weight:500;color:var(--t2);white-space:nowrap">Min trade</span>
          <span style="display:flex;align-items:stretch;width:92px;border:1px solid var(--line);border-radius:7px;overflow:hidden">
            <span style="display:flex;align-items:center;padding:0 2px 0 9px;font-size:13px;color:var(--t3)">$</span>
            <input value="{view.minDraft}" oninput={view.onMin} inputmode="decimal" style="flex:1;min-width:0;height:30px;padding:0 8px 0 3px;border:none;background:transparent;color:var(--t1);font-size:13px;outline:none">
          </span>
        </span>

        <button onclick={view.togWhole} style="display:flex;align-items:center;gap:8px;height:30px;padding:0 11px 0 9px;border:1px solid {view.wholeBorder};border-radius:7px;background:{view.wholeBg};color:var(--t1);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover6">
          <span style="width:15px;height:15px;flex:none;border:1px solid {view.wholeBoxBorder};border-radius:4px;background:{view.wholeBoxBg};display:flex;align-items:center;justify-content:center;color:var(--on-accent);font-size:10px;font-weight:700">{view.wholeMark}</span>
          Whole shares only
        </button>
      </div>
    </div>

    <div data-r="two" style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(330px,1fr);gap:18px;align-items:start">

      <div style="display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:13px 16px;border-bottom:1px solid var(--line)">
          <span style="font-size:13px;font-weight:600;color:var(--t1)">By category</span>
          <span style="display:flex;align-items:center;gap:13px;flex-wrap:wrap">
            {#each view.legend as l}
              <span style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t3);white-space:nowrap">
                <span style="width:12px;height:8px;border-radius:2px;background:{l.bg};border:{l.border}"></span>{l.label}
              </span>
            {/each}
          </span>
        </div>

        <div style="max-width:100%;overflow-x:auto;overscroll-behavior-x:contain">
          <div data-r="catwrap">
            <div style="display:grid;grid-template-columns:{view.catCols};border-bottom:1px solid var(--line)">
              {#each view.catHead as h}
                <div style="display:flex;align-items:center;justify-content:{h.justify};padding:9px 13px">
                  <span style="font-size:12px;font-weight:500;color:var(--t2);white-space:nowrap">{h.label}</span>
                </div>
              {/each}
            </div>
            {#each view.catRows as c}
              <div onmouseenter={c.onEnter} onmouseleave={c.onLeave} style="display:grid;grid-template-columns:{view.catCols};border-bottom:1px solid var(--line);background:{c.bg};border-left:{c.flagBorder}" role="button" tabindex="0" onfocus={c.onEnter} onclick={c.onEnter} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); c.onEnter(event); } }} onblur={c.onLeave}>
                <div style="display:flex;align-items:center;padding:12px 13px;min-width:0;overflow:hidden">
                  <span style="display:block;min-width:0;flex:1;overflow:hidden">
                    <TwoLineCell primary={c.name} secondary={c.sub} align="left" />
                  </span>
                </div>
                <div style="display:flex;flex-direction:column;justify-content:center;gap:7px;padding:12px 13px;min-width:0">
                  <span style="position:relative;display:block;height:9px;border-radius:3px;background:var(--track)">
                    <span style="position:absolute;left:0;top:0;bottom:0;width:{c.baseW};border-radius:3px 0 0 3px;background:var(--grey-series)"></span>
                    <span style="position:absolute;left:{c.segL};top:0;bottom:0;width:{c.segW};background:{c.segBg};border-radius:0 3px 3px 0"></span>
                    <span style="position:absolute;left:{c.tickX};top:-4px;bottom:-4px;width:2px;background:var(--t1);border-radius:1px"></span>
                  </span>
                  <span style="display:flex;align-items:baseline;gap:8px;font-size:11.5px;color:var(--t3);white-space:nowrap">{c.weightLine}</span>
                </div>
                <div style="display:flex;align-items:center;justify-content:flex-end;padding:12px 13px">
                  <span style="font-size:13px;font-weight:500;color:{c.driftColor};white-space:nowrap">{c.drift}</span>
                </div>
                <div style="display:flex;align-items:center;justify-content:flex-end;padding:12px 13px;min-width:0;overflow:hidden">
                  <span style="display:block;min-width:0;flex:1;overflow:hidden">
                    <TwoLineCell primary={c.action} secondary={c.actionSub} tone={c.actionTone} align="right" />
                  </span>
                </div>
                <div style="display:flex;align-items:center;justify-content:flex-end;padding:12px 13px;min-width:0;overflow:hidden">
                  <span style="display:block;min-width:0;flex:1;overflow:hidden">
                    <TwoLineCell primary={c.after} secondary={c.afterSub} tone={c.afterTone} align="right" />
                  </span>
                </div>
              </div>
            {/each}
            <div style="display:grid;grid-template-columns:{view.catCols};border-top:1px solid var(--t3)">
              <div style="display:flex;align-items:center;padding:12px 13px;min-width:0">
                <TwoLineCell primary="Total" secondary={view.catTotalSub} align="left" />
              </div>
              <div style="display:flex;align-items:center;padding:12px 13px">
                <span style="font-size:11.5px;color:var(--t3)">{view.catTotalNote}</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:12px 13px">
                <span style="font-size:13px;font-weight:600;color:var(--t1);white-space:nowrap">{view.driftTotal}</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:12px 13px;min-width:0">
                <TwoLineCell primary={view.actionTotal} secondary={view.actionTotalSub} align="right" />
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:12px 13px;min-width:0">
                <TwoLineCell primary={view.driftAfterTotal} secondary={view.driftAfterSub} tone="pos" align="right" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div data-r="panel" style="position:sticky;top:74px;display:flex;flex-direction:column;gap:18px">
        <div style="display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 18px;border-bottom:1px solid var(--line)">
            <span style="font-size:13px;font-weight:600;color:var(--t1)">{view.fundTitle}</span>
            <span style="font-size:11.5px;color:var(--t3)">{view.fundNote}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:11px;padding:15px 18px;border-bottom:1px solid var(--line)">
            <span style="display:flex;height:10px;border-radius:3px;overflow:hidden;gap:2px">
              {#each view.fundBar as b}
                <span style="width:{b.w};background:{b.bg};display:block"></span>
              {/each}
            </span>
            {#each view.fundRows as f}
              <span style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding-top:{f.pad};border-top:{f.border}">
                <span style="display:flex;align-items:center;gap:7px;min-width:0">
                  <span style="width:9px;height:9px;flex:none;border-radius:2px;background:{f.dot};opacity:{f.dotOpacity}"></span>
                  <span style="font-size:12.5px;color:{f.labelColor};font-weight:{f.weight}">{f.label}</span>
                </span>
                <span style="font-size:13px;font-weight:{f.weight};color:{f.color};white-space:nowrap">{f.value}</span>
              </span>
            {/each}
          </div>
          <div style="display:flex;flex-direction:column;gap:9px;padding:15px 18px">
            <span style="display:flex;align-items:baseline;justify-content:space-between;gap:10px">
              <span style="font-size:12px;font-weight:500;color:var(--t2)">Drift closed</span>
              <span style="font-size:12.5px;color:var(--t1)">{view.driftPath}</span>
            </span>
            <span style="position:relative;display:block;height:8px;border-radius:3px;background:var(--track)">
              <span style="position:absolute;left:0;top:0;bottom:0;width:{view.closedW};border-radius:3px;background:var(--accent)"></span>
            </span>
            <span style="font-size:11.5px;line-height:1.5;color:var(--t3)">{view.closedNote}</span>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 18px;border-bottom:1px solid var(--line)">
            <span style="font-size:13px;font-weight:600;color:var(--t1)">Before you place these</span>
            <span style="font-size:11.5px;color:var(--t3)">{view.flagCount}</span>
          </div>
          {#each view.flags as w}
            <div style="display:flex;flex-direction:column;gap:3px;padding:12px 18px 12px 15px;border-bottom:1px solid var(--line);border-left:3px solid {w.tone}">
              <span style="font-size:12.5px;font-weight:500;color:var(--t1)">{w.title}</span>
              <span style="font-size:11.5px;line-height:1.55;color:var(--t2);text-wrap:pretty">{w.body}</span>
            </div>
          {/each}
          {#if view.noFlags}
            <div style="display:flex;flex-direction:column;gap:4px;padding:20px 18px;align-items:center">
              <span style="font-size:12.5px;font-weight:500;color:var(--t1)">Nothing to watch</span>
              <span style="font-size:11.5px;color:var(--t3);text-align:center">Every leg clears the minimum and buys a whole number of shares.</span>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:13px 16px;border-bottom:1px solid var(--line)">
        <span style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:600;color:var(--t1)">Trades to place</span>
          <span style="font-size:11.5px;color:var(--t3)">{view.legNote}</span>
        </span>
        <span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          {#each view.legFilters as l}
            <button onclick={l.onClick} style="height:28px;padding:0 11px;border:1px solid {l.border};border-radius:999px;background:{l.bg};color:{l.color};font-size:11.5px;font-weight:{l.weight};cursor:pointer;white-space:nowrap" class="hover7">{l.label}</button>
          {/each}
        </span>
      </div>

      <div style="max-width:100%;overflow-x:auto;overscroll-behavior-x:contain">
        <div data-r="legwrap">
          <div style="display:grid;grid-template-columns:{view.legCols};border-bottom:1px solid var(--line)">
            {#each view.legHead as h}
              <div style="display:flex;align-items:center;justify-content:{h.justify};padding:9px 13px;position:{h.pos};left:0;z-index:{h.z};background:var(--card)">
                <span style="font-size:12px;font-weight:500;color:var(--t2);white-space:nowrap">{h.label}</span>
              </div>
            {/each}
          </div>
          {#each view.legRows as r}
            <div style="display:grid;grid-template-columns:{view.legCols};border-bottom:1px solid var(--line);background:{r.bg};border-left:{r.flagBorder}">
              <div style="display:flex;align-items:center;gap:9px;padding:11px 13px;min-width:0;position:sticky;left:0;z-index:1;background:{r.bg}">
                <span style="width:26px;height:26px;flex:none;border-radius:6px;background:var(--hover);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:600;color:var(--t2)">{r.mono}</span>
                <span style="display:block;min-width:0;flex:1;overflow:hidden">
                  <TwoLineCell primary={r.ticker} secondary={r.name} align="left" />
                </span>
              </div>
              <div style="display:flex;align-items:center;padding:11px 13px;min-width:0;overflow:hidden">
                <span style="display:block;min-width:0;flex:1;overflow:hidden">
                  <TwoLineCell primary={r.category} secondary={r.catSub} align="left" />
                </span>
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 13px;min-width:0">
                <TwoLineCell primary={r.value} secondary={r.weight} align="right" />
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 13px">
                <span style="display:inline-flex;align-items:center;height:22px;padding:0 10px;border-radius:999px;background:{r.sideBg};color:{r.sideFg};font-size:11.5px;font-weight:500;white-space:nowrap">{r.side}</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 13px;min-width:0">
                <TwoLineCell primary={r.amount} secondary={r.shares} tone={r.amountTone} align="right" />
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 13px;min-width:0">
                <TwoLineCell primary={r.after} secondary={r.afterSub} align="right" />
              </div>
              <div style="display:flex;align-items:center;padding:11px 13px;min-width:0;overflow:hidden">
                {#if r.note}
                  <span style="font-size:11px;line-height:1.4;color:{r.noteColor};overflow:hidden;text-overflow:ellipsis">{r.note}</span>
                {/if}
              </div>
            </div>
          {/each}
          {#if view.legsEmpty}
            <div style="display:flex;flex-direction:column;align-items:center;gap:7px;padding:50px 20px">
              <span style="font-size:13.5px;font-weight:500;color:var(--t1)">{view.legsEmptyTitle}</span>
              <span style="font-size:12px;color:var(--t3);text-align:center;max-width:420px;line-height:1.6">{view.legsEmptyBody}</span>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <span style="font-size:11px;line-height:1.55;color:var(--t3);max-width:960px;text-wrap:pretty">{view.footnote}</span>
  </main></div>

<style>
:global(html[data-theme="dark"]) { --scrim:rgba(0,0,0,.6); --track:#3A3431; --tick:#3A3431; }
:global(:root) { --scrim:rgba(12,12,12,.42); --track:#E4E1DF; --tick:#CFCAC6; }
.hover0:hover{border-color:var(--t3);color:var(--t2)}
.hover1:hover{background:var(--hover);text-decoration:none}
.hover2:hover{background:var(--hover);text-decoration:none}
.hover3:hover{background:var(--hover)}
.hover4:hover{background:var(--hover)}
.hover5:hover{background:var(--hover)}
.hover6:hover{background:var(--hover)}
.hover7:hover{background:var(--hover)}
@media (max-width:1320px){
      [data-r="two"]{grid-template-columns:minmax(0,1fr)!important}
      [data-r="panel"]{position:static!important}
    }
    @media (max-width:1180px){[data-r="catwrap"]{min-width:880px}[data-r="legwrap"]{min-width:1000px}}
    @media (max-width:1080px){[data-r="stats"]{grid-template-columns:1fr 1fr!important}}
    @media (max-width:960px){
      
      
      
      [data-r="main"]{padding:16px 16px 104px!important}
    }
  
</style>
