<script lang="ts">
  import { untrack } from "svelte";
  import Model from "$lib/presenters/Cash";
  import ChartTooltip from "$lib/components/ChartTooltip.svelte";
  import Metric from "$lib/components/Metric.svelte";
  import NumberLineGauge from "$lib/components/NumberLineGauge.svelte";
  import TopNav from "$lib/components/TopNav.svelte";
  import TwoLineCell from "$lib/components/TwoLineCell.svelte";
  let { engine }: { engine: any } = $props();
  const model = $derived(new Model(engine));
  const view: any = $derived.by(() => { model.revision; return model.renderVals(); });
  $effect(() => { const current = model; untrack(() => current.componentDidMount?.()); return () => current.componentWillUnmount?.(); });
</script>


<div style="min-height:100vh;background:var(--canvas);color:var(--t1);font-size:14px;line-height:1.45">

  <TopNav active="Portfolio" subActive="Cash" portfolioName={engine.constants.portfolioName} holdingsCount={engine.totals().holdings} />

  <main data-r="main" data-screen-label="Portfolio — Cash" style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:18px">

    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap">
      <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;position:relative">
          <h1 style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)">Cash</h1>
          <span onmouseenter={view.titleTipOn} onmouseleave={view.titleTipOff} style="width:16px;height:16px;margin-top:6px;flex:none;border:1px solid var(--line);border-radius:50%;font-size:10px;font-weight:500;color:var(--t3);display:flex;align-items:center;justify-content:center;cursor:help" class="hover0" role="button" tabindex="0" onfocus={view.titleTipOn} onclick={view.titleTipOn} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); view.titleTipOn(event); } }} onblur={view.titleTipOff}>?</span>
          {#if view.titleTip}
            <span style="position:absolute;top:44px;left:0;z-index:40;width:340px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:10px 12px;font-size:11.5px;line-height:1.55;color:var(--t2)">{view.titleTipText}</span>
          {/if}
          <span style="font-size:13px;color:var(--t3);padding-top:6px">{view.portfolioName}</span>
        </div>
        <span style="font-size:12px;color:var(--t3)">{view.headNote}</span>
      </div>

      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <a href="/portfolio/transactions" style="display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 13px;border:1px solid var(--line);border-radius:7px;font-size:12.5px;font-weight:500;color:var(--t1);white-space:nowrap" class="hover1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>
          Update cash balance
        </a>
        <div style="position:relative">
          <button onclick={view.togMore} title="More" style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:1px solid var(--line);border-radius:7px;background:{view.moreBg};color:var(--t2);cursor:pointer" class="hover2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"></circle><circle cx="12" cy="12" r="1.6"></circle><circle cx="19" cy="12" r="1.6"></circle></svg>
          </button>
          {#if view.mMore}
            <div style="position:absolute;top:38px;right:0;z-index:50;min-width:216px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px;animation:menuIn .12s ease-out">
              {#each view.moreRows as m}
                <button onclick={m.onClick} style="display:flex;align-items:center;width:100%;padding:8px 10px;border:none;border-radius:6px;background:transparent;text-align:left;cursor:pointer;font-size:12.5px;color:var(--t1)" class="hover3">{m.label}</button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div data-r="kpi" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px">
      {#each view.kpis as k}
        <div style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:20px;display:flex;flex-direction:column;gap:14px">
          <Metric label={k.label} tip={k.tip} dotted={true} primary={k.primary} primaryTone={k.tone} primaryDelta={k.delta} deltaTone={k.deltaTone} secondary={k.secondary} secondaryNote={k.note} />
          <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--t3)">
            <span>{k.footA}</span>
            <span style="width:1px;height:10px;background:var(--line)"></span>
            <span>{k.footB}</span>
          </div>
        </div>
      {/each}
    </div>

    <div data-r="two" style="display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:18px;align-items:start">

      <div style="display:flex;flex-direction:column;gap:0;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:15px 20px;border-bottom:1px solid var(--line)">
          <span style="font-size:14px;font-weight:600;color:var(--t1)">Balances by currency</span>
          <span style="font-size:11.5px;color:var(--t3)">{view.balancesNote}</span>
        </div>
        <div style="overflow-x:auto"><div style="min-width:564px">
        <div style="display:grid;grid-template-columns:minmax(120px,1fr) 120px 96px 104px 132px;border-bottom:1px solid var(--line)">
          {#each view.curHead as h}
            <div style="display:flex;align-items:center;justify-content:{h.justify};padding:9px 16px">
              <span style="font-size:12px;font-weight:500;color:var(--t2);white-space:nowrap">{h.label}</span>
            </div>
          {/each}
        </div>
        {#each view.curRows as r}
          <div style="display:grid;grid-template-columns:minmax(120px,1fr) 120px 96px 104px 132px;border-bottom:1px solid var(--line)">
            <div style="display:flex;align-items:center;gap:9px;padding:11px 16px;min-width:0">
              <span style="width:26px;height:26px;flex:none;border-radius:6px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--accent)">{r.symbol}</span>
              <TwoLineCell primary={r.currency} secondary={r.sub} align="left" />
            </div>
            <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 16px">
              <TwoLineCell primary={r.balance} secondary={r.inBase} align="right" />
            </div>
            <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 16px">
              <span style="font-size:13px;color:var(--t1)">{r.share}</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 16px">
              <span style="font-size:13px;color:var(--t1)">{r.yield}</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 16px">
              <TwoLineCell primary={r.income} secondary={r.monthly} align="right" />
            </div>
          </div>
        {/each}
        </div></div>
        <div style="display:flex;flex-direction:column;gap:10px;padding:15px 20px">
          <span style="font-size:12px;font-weight:500;color:var(--t2)">What the balance is held in</span>
          {#each view.holdRows as h}
            <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 13px;border:1px solid var(--line);border-radius:8px;flex-wrap:wrap">
              <span style="display:flex;align-items:center;gap:10px;min-width:0">
                <span style="width:28px;height:28px;flex:none;border-radius:6px;background:var(--hover);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:var(--t2)">{h.mono}</span>
                <TwoLineCell primary={h.ticker} secondary={h.name} align="left" />
              </span>
              <span style="display:flex;align-items:center;gap:18px">
                <TwoLineCell primary={h.value} secondary={h.freq} align="right" />
                <TwoLineCell primary={h.yield} secondary={h.income} align="right" />
              </span>
            </div>
            {#if h.caveat}
              <span style="display:flex;align-items:flex-start;gap:8px;border-left:2px solid var(--amber);padding:2px 0 2px 10px;font-size:11.5px;line-height:1.5;color:var(--t2)">{h.caveat}</span>
            {/if}
          {/each}
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <span style="font-size:14px;font-weight:600;color:var(--t1)">Cash drag</span>
          <span style="font-size:11.5px;color:var(--t3)">{view.dragHead}</span>
        </div>
        <NumberLineGauge min={view.gaugeMin} max={view.gaugeMax} minLabel={view.gaugeMinLabel} maxLabel={view.gaugeMaxLabel} statement={view.gaugeStatement} verdict={view.gaugeVerdict} verdictTone={view.gaugeTone} note={view.gaugeNote} tickValues={view.gaugeTicks} markers={view.gaugeMarkers} />
        <div style="display:flex;flex-direction:column;gap:0;border:1px solid var(--line);border-radius:8px;overflow:hidden">
          {#each view.dragRows as d}
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 13px;border-bottom:1px solid var(--line)">
              <span style="display:flex;flex-direction:column;gap:1px;min-width:0">
                <span style="font-size:12.5px;color:var(--t2)">{d.label}</span>
                <span style="font-size:11px;color:var(--t3)">{d.note}</span>
              </span>
              <span style="font-size:13px;font-weight:600;color:{d.color};white-space:nowrap">{d.value}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:20px 22px 18px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div style="display:flex;flex-direction:column;gap:3px">
          <span style="font-size:14px;font-weight:600;color:var(--t1)">Cash movements by month</span>
          <span style="font-size:11.5px;color:var(--t3)">{view.flowNote}</span>
        </div>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          {#each view.flowLegend as l}
            <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t2);white-space:nowrap">
              <span style="width:9px;height:9px;border-radius:2px;background:{l.color}"></span>{l.label}
            </span>
          {/each}
        </div>
      </div>

      <div style="max-width:100%;overflow-x:auto;overscroll-behavior-x:contain;padding-top:9px">
        <div data-r="flowwrap" style="display:flex;gap:12px">
          <div style="width:58px;flex:none;position:relative;height:212px">
            {#each view.flowTicks as t}
              <span style="position:absolute;right:0;top:{t.top};transform:translateY(-50%);font-size:10.5px;color:var(--t3);white-space:nowrap">{t.label}</span>
            {/each}
          </div>
          <div onmouseleave={view.flowOff} style="position:relative;flex:1;min-width:0;height:212px" role="group">
            {#each view.flowTicks as t}
              <span style="position:absolute;left:0;right:0;top:{t.top};height:1px;background:{t.color};border-top:{t.border}"></span>
            {/each}
            <div style="position:absolute;inset:0;display:flex;gap:3px">
              {#each view.flowBars as b}
                <div onmouseenter={b.onEnter} style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:flex-start;align-items:center;cursor:default;background:{b.slotBg};border-radius:5px" role="button" tabindex="0" onfocus={b.onEnter} onclick={b.onEnter} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); b.onEnter(event); } }}>
                  <span style="height:96px;width:100%;display:flex;align-items:flex-end;justify-content:center">
                    <span style="width:64%;max-width:26px;height:{b.inH};background:var(--accent);display:block"></span>
                  </span>
                  <span style="height:96px;width:100%;display:flex;align-items:flex-start;justify-content:center">
                    <span style="width:64%;max-width:26px;height:{b.outH};background:var(--grey-series);display:block"></span>
                  </span>
                  <span style="font-size:10px;color:{b.labelColor};white-space:nowrap;padding-top:3px">{b.label}</span>
                </div>
              {/each}
            </div>
            {#if view.flowTip}
              <div style="position:absolute;left:{view.tipLeft};top:0;transform:{view.tipShift};z-index:20;pointer-events:none">
                <ChartTooltip tip={view.flowTip} />
              </div>
            {/if}
          </div>
        </div>
      </div>
      <span style="font-size:11px;line-height:1.5;color:var(--t3)">{view.flowFootnote}</span>
    </div>

    <div style="display:flex;flex-direction:column;gap:0;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:16px 20px 14px;border-bottom:1px solid var(--line)">
        <div style="display:flex;flex-direction:column;gap:3px">
          <span style="font-size:14px;font-weight:600;color:var(--t1)">Movements</span>
          <span style="font-size:11.5px;color:var(--t3)">{view.moveNote}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          {#if view.searchOpen}
            <input value="{view.query}" oninput={view.onQuery} placeholder="Filter by ticker…" style="height:30px;width:160px;padding:0 11px;border:1px solid var(--line);border-radius:7px;background:var(--card);font-size:12px;color:var(--t1);outline:none">
          {/if}
          <button onclick={view.togSearch} title="Search" style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid var(--line);border-radius:7px;background:{view.searchBg};color:var(--t2);cursor:pointer" class="hover4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
          </button>
          <div style="display:flex;gap:2px;padding:2px;border:1px solid var(--line);border-radius:7px;flex-wrap:wrap">
            {#each view.filters as f}
              <button onclick={f.onClick} style="height:26px;padding:0 10px;border:none;border-radius:5px;background:{f.bg};color:{f.color};font-size:11.5px;font-weight:{f.weight};cursor:pointer;white-space:nowrap" class="hover5">{f.label}</button>
            {/each}
          </div>
        </div>
      </div>
      <div style="max-width:100%;overflow-x:auto;overscroll-behavior-x:contain">
        <div data-r="movewrap">
          <div style="display:grid;grid-template-columns:{view.moveCols};border-bottom:1px solid var(--line)">
            {#each view.moveHead as h}
              <div style="display:flex;align-items:center;justify-content:{h.justify};padding:10px 16px">
                <span style="font-size:12px;font-weight:500;color:var(--t2);white-space:nowrap">{h.label}</span>
              </div>
            {/each}
          </div>
          {#each view.moveRows as r}
            <div style="display:grid;grid-template-columns:{view.moveCols};border-bottom:1px solid var(--line)">
              <div style="display:flex;align-items:center;padding:9px 16px">
                <span style="font-size:13px;color:var(--t1);white-space:nowrap">{r.date}</span>
              </div>
              <div style="display:flex;align-items:center;padding:9px 16px">
                <span style="display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:5px;background:{r.typeBg};color:{r.typeFg};font-size:11px;font-weight:500;white-space:nowrap">
                  <span style="width:5px;height:5px;border-radius:1px;background:{r.typeDot}"></span>{r.type}
                </span>
              </div>
              <div style="display:flex;align-items:center;padding:9px 16px;min-width:0">
                <TwoLineCell primary={r.label} secondary={r.detail} align="left" />
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:9px 16px">
                <span style="font-size:13px;font-weight:500;color:var(--accent);white-space:nowrap">{r.in}</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:9px 16px">
                <span style="font-size:13px;color:var(--t1);white-space:nowrap">{r.out}</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:9px 16px">
                <span style="font-size:13px;color:var(--t2);white-space:nowrap">{r.balance}</span>
              </div>
            </div>
          {/each}
          {#if view.isEmpty}
            <div style="display:flex;flex-direction:column;align-items:center;gap:7px;padding:40px 20px">
              <span style="font-size:14px;font-weight:500;color:var(--t1)">No movements match</span>
              <span style="font-size:12.5px;color:var(--t3)">{view.emptyHint}</span>
            </div>
          {/if}
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 20px">
        <span style="font-size:11.5px;color:var(--t3)">{view.pageNote}</span>
        {#if view.hasMore}
          <button onclick={view.showMore} style="height:30px;padding:0 14px;border:1px solid var(--line);border-radius:7px;background:transparent;font-size:12.5px;font-weight:500;color:var(--t1);cursor:pointer" class="hover6">{view.moreLabel}</button>
        {/if}
      </div>
    </div>

    <span style="font-size:11px;line-height:1.55;color:var(--t3);max-width:900px">{view.footnote}</span>
  </main></div>

<style>
:global(html[data-theme="dark"]) { --chip-bg:var(--hover); --track:#3A3431; --tick:#3A3431; --off:#121110; }
:global(:root) { --chip-bg:var(--hover); --track:#E4E1DF; --tick:#CFCAC6; --off:#FAFAF9; }
.hover0:hover{border-color:var(--t3);color:var(--t2)}
.hover1:hover{background:var(--hover);text-decoration:none}
.hover2:hover{background:var(--hover)}
.hover3:hover{background:var(--hover)}
.hover4:hover{background:var(--hover)}
.hover5:hover{background:var(--hover)}
.hover6:hover{background:var(--hover)}
@media (max-width:1180px){
      [data-r="kpi"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      [data-r="two"]{grid-template-columns:minmax(0,1fr)!important}
    }
    @media (max-width:960px){
      
      
      
      [data-r="main"]{padding:16px 16px 104px!important}
      [data-r="kpi"]{grid-template-columns:minmax(0,1fr)!important}
      [data-r="flowwrap"]{min-width:760px}
      [data-r="movewrap"]{min-width:880px}
    }
  
</style>
