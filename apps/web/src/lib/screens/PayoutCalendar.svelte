<script lang="ts">
  import { untrack } from "svelte";
  import Model from "$lib/presenters/PayoutCalendar";
  import Metric from "$lib/components/Metric.svelte";
  import TopNav from "$lib/components/TopNav.svelte";
  let { engine }: { engine: any } = $props();
  const model = $derived(new Model(engine));
  const view: any = $derived.by(() => { model.revision; return model.renderVals(); });
  $effect(() => { const current = model; untrack(() => current.componentDidMount?.()); return () => current.componentWillUnmount?.(); });
</script>


<div style="min-height:100vh;background:var(--canvas);color:var(--t1);font-size:14px;line-height:1.45">

  <TopNav active="Tools" subActive="Dividend payout calendar" portfolioName={engine.constants.portfolioName} holdingsCount={engine.totals().holdings} />

  <main data-r="main" data-screen-label="Tools — Dividend payout calendar" style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:18px">

    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap">
      <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;position:relative">
          <h1 style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)">Dividend payout calendar</h1>
          <span onmouseenter={view.titleTipOn} onmouseleave={view.titleTipOff} style="width:16px;height:16px;margin-top:6px;flex:none;border:1px solid var(--line);border-radius:50%;font-size:10px;font-weight:500;color:var(--t3);display:flex;align-items:center;justify-content:center;cursor:help" class="hover0" role="button" tabindex="0" onfocus={view.titleTipOn} onclick={view.titleTipOn} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); view.titleTipOn(event); } }} onblur={view.titleTipOff}>?</span>
          {#if view.titleTip}
            <span style="position:absolute;top:44px;left:0;z-index:40;width:360px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:10px 12px;font-size:11.5px;line-height:1.55;color:var(--t2)">{view.titleTipText}</span>
          {/if}
          <span style="font-size:13px;color:var(--t3);padding-top:6px">{view.universeLabel}</span>
        </div>
        <span style="font-size:12px;color:var(--t3)">{view.headNote}</span>
      </div>

      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <div style="display:inline-flex;align-items:center;gap:2px;height:32px;padding:0 2px;border:1px solid var(--line);border-radius:7px;background:var(--card)">
          <button onclick={view.monthBack} title="Previous month" style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border:none;border-radius:5px;background:transparent;color:var(--t2);cursor:pointer" class="hover1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"></path></svg>
          </button>
          <span style="min-width:104px;text-align:center;font-size:12.5px;font-weight:600;color:var(--t1);white-space:nowrap">{view.monthLabel}</span>
          <button onclick={view.monthFwd} title="Next month" style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border:none;border-radius:5px;background:transparent;color:var(--t2);cursor:pointer" class="hover2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>
          </button>
        </div>
        <button onclick={view.goToday} style="display:inline-flex;align-items:center;height:32px;padding:0 13px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--t1);font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover3">This month</button>
        <a href="/portfolio/dividend-calendar" style="display:inline-flex;align-items:center;height:32px;padding:0 13px;border:1px solid var(--line);border-radius:7px;color:var(--t1);font-size:12.5px;font-weight:500;text-decoration:none;white-space:nowrap" class="hover4">My calendar</a>
      </div>
    </div>

    <div data-r="stats" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
      {#each view.stats as s}
        <div style="padding:16px 20px;border-left:{s.border}">
          <Metric label={s.label} primary={s.primary} primaryTone={s.tone} secondary={s.secondary} secondaryNote={s.note} tip={s.tip} help={true} />
        </div>
      {/each}
    </div>

    <div style="display:flex;flex-direction:column;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:18px 20px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <span style="font-size:12px;font-weight:500;color:var(--t2)">{view.chartTitle}</span>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          {#each view.statusLegend as l}
            <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t2);white-space:nowrap">
              <span style="width:9px;height:9px;border-radius:2px;background:{l.color}"></span>{l.label}
            </span>
          {/each}
        </div>
      </div>
      <div style="display:flex;align-items:flex-end;gap:6px;height:150px">
        {#each view.chartBars as b}
          <div onclick={b.onClick} onmouseenter={b.onEnter} onmouseleave={b.onLeave} style="flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px;cursor:pointer;border-radius:6px;background:{b.slotBg};padding:4px 0" role="button" tabindex="0" onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); b.onClick(event); } }} onfocus={b.onEnter} onblur={b.onLeave}>
            <span style="font-size:10px;font-weight:500;color:{b.labelColor};white-space:nowrap">{b.value}</span>
            <span style="flex:1;min-height:0;width:100%;display:flex;align-items:flex-end;justify-content:center">
              <span style="flex:none;width:76%;max-width:40px;display:flex;flex-direction:column;justify-content:flex-end;height:{b.h};min-height:2px">
                {#each b.segments as s}
                  <span style="display:block;height:{s.h};background:{s.color}"></span>
                {/each}
              </span>
            </span>
            <span style="font-size:10px;color:{b.tickColor};white-space:nowrap">{b.label}</span>
          </div>
        {/each}
      </div>
      <span style="font-size:11px;color:var(--t3)">{view.chartNote}</span>
    </div>

    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px 16px">
      <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">
        {#each view.dropdowns as d}
          <span style="display:flex;flex-direction:column;gap:6px">
            <span style="font-size:11.5px;font-weight:500;color:var(--t2);white-space:nowrap">{d.title}</span>
            <div style="position:relative">
              <button onclick={d.onToggle} style="display:flex;align-items:center;justify-content:space-between;gap:10px;width:{d.w};height:32px;padding:0 11px;border:1px solid {d.border};border-radius:7px;background:{d.bg};color:var(--t1);font-size:12.5px;font-weight:500;cursor:pointer" class="hover5">
                <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{d.value}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" style="color:var(--t3);flex:none"><path d="M6 9l6 6 6-6"></path></svg>
              </button>
              {#if d.open}
                <div style="position:absolute;top:36px;left:0;z-index:50;width:236px;max-height:300px;overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px;animation:menuIn .12s ease-out">
                  {#each d.options as o}
                    <button onclick={o.onClick} style="display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:8px 10px;border:none;border-radius:6px;background:{o.bg};text-align:left;cursor:pointer;font-size:12.5px;color:{o.color};font-weight:{o.weight}" class="hover6">
                      <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{o.label}</span>
                      <span style="font-size:11px;color:var(--t3);white-space:nowrap">{o.meta}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          </span>
        {/each}

        <span style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:11.5px;font-weight:500;color:var(--t2);white-space:nowrap">Min yield</span>
          <span style="display:flex;align-items:stretch;width:104px;border:1px solid {view.yieldBorder};border-radius:7px;overflow:hidden">
            <input value="{view.minYield}" oninput={view.onMinYield} inputmode="decimal" placeholder="0" style="flex:1;min-width:0;height:30px;padding:0 4px 0 9px;border:none;background:transparent;color:var(--t1);font-size:12.5px;outline:none">
            <span style="display:flex;align-items:center;padding:0 9px 0 2px;font-size:12.5px;color:var(--t3)">%</span>
          </span>
        </span>

        <button onclick={view.togMine} style="display:flex;align-items:center;gap:8px;height:32px;padding:0 11px 0 9px;border:1px solid {view.mineBorder};border-radius:7px;background:{view.mineBg};color:var(--t1);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover7">
          <span style="width:15px;height:15px;flex:none;border:1px solid {view.mineBoxBorder};border-radius:4px;background:{view.mineBoxBg};display:flex;align-items:center;justify-content:center;color:var(--on-accent);font-size:10px;font-weight:700">{view.mineMark}</span>
          My holdings only
        </button>

        {#if view.filtered}
          <button onclick={view.reset} style="height:32px;padding:0 11px;border:none;border-radius:7px;background:transparent;color:var(--t2);font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover8">Reset</button>
        {/if}
      </div>

      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="display:flex;align-items:center;gap:7px;height:32px;padding:0 11px;border:1px solid var(--line);border-radius:7px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M16.6 16.6L21 21"></path></svg>
          <input value="{view.query}" oninput={view.onQuery} placeholder="Ticker or name…" style="width:150px;border:none;background:transparent;color:var(--t1);font-size:12.5px;outline:none">
        </span>
        <div style="display:flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--line);border-radius:8px">
          {#each view.views as v}
            <button onclick={v.onClick} style="height:28px;padding:0 14px;border:none;border-radius:6px;background:{v.bg};color:{v.color};font-size:12px;font-weight:{v.weight};cursor:pointer" class="hover9">{v.label}</button>
          {/each}
        </div>
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
      <span style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="display:inline-flex;align-items:center;height:30px;padding:0 12px;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-size:12.5px;font-weight:600;white-space:nowrap">{view.monthTotal}</span>
        <span style="font-size:12px;color:var(--t3)">{view.monthNote}</span>
      </span>
      <span style="font-size:11.5px;color:var(--t3)">{view.statusNote}</span>
    </div>

    {#if view.isCalendar}
      <div style="max-width:100%;overflow-x:auto;overscroll-behavior-x:contain">
        <div data-r="grid" style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border:1px solid var(--line);border-top:none;border-radius:8px;overflow:hidden;background:var(--card)">
          {#each view.weekdays as w}
            <div style="padding:9px 11px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--card)">
              <span style="font-size:11px;font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:var(--t3)">{w.label}</span>
            </div>
          {/each}
          {#each view.cells as c}
            <div style="min-height:124px;padding:8px;border-bottom:1px solid var(--line);border-right:1px solid var(--line);background:{c.bg};display:flex;flex-direction:column;gap:6px;min-width:0">
              {#if c.inMonth}
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                  <span style="display:flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;border-radius:5px;background:{c.dayBg};color:{c.dayColor};font-size:11.5px;font-weight:{c.dayWeight}">{c.day}</span>
                  {#if c.hasTotal}
                    <span style="font-size:11px;font-weight:600;color:var(--t2);white-space:nowrap">{c.total}</span>
                  {/if}
                </div>
                {#each c.events as e}
                  <div style="display:flex;align-items:flex-start;gap:7px;padding:6px;border:1px solid {e.border};border-radius:6px;background:{e.bg};min-width:0">
                    <span style="width:22px;height:22px;flex:none;border-radius:5px;background:var(--hover);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;color:var(--t2)">{e.mono}</span>
                    <span style="display:flex;flex-direction:column;gap:2px;min-width:0;flex:1">
                      <span style="display:flex;align-items:baseline;justify-content:space-between;gap:6px;min-width:0">
                        <span style="flex:1 1 auto;min-width:0;font-size:11.5px;font-weight:600;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{e.ticker}</span>
                        <span style="flex:0 0 auto;font-size:11.5px;font-weight:600;color:var(--t1);white-space:nowrap">{e.amount}</span>
                      </span>
                      <span style="display:flex;align-items:center;gap:5px;min-width:0">
                        <span style="width:6px;height:6px;flex:none;border-radius:50%;background:{e.dot}"></span>
                        <span style="flex:0 0 auto;font-size:10.5px;color:var(--t3);white-space:nowrap">{e.yield}</span>
                        <span style="flex:1 1 auto;min-width:0;font-size:10.5px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{e.name}</span>
                      </span>
                    </span>
                  </div>
                {/each}
                {#if c.more}
                  <button onclick={c.onMore} style="align-self:flex-start;padding:2px 6px;border:none;border-radius:5px;background:transparent;color:var(--t3);font-size:10.5px;font-weight:500;cursor:pointer" class="hover10">{c.more}</button>
                {/if}
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if view.isList}
      <div style="max-width:100%;border:1px solid var(--line);border-radius:8px;background:var(--card);overflow-x:auto;overscroll-behavior-x:contain">
        <div data-r="lwrap">
          <div style="display:grid;grid-template-columns:{view.listCols};border-bottom:1px solid var(--line)">
            {#each view.listHead as h}
              <div style="display:flex;align-items:center;justify-content:{h.justify};padding:10px 13px">
                <span style="font-size:12px;font-weight:500;color:var(--t2);white-space:nowrap">{h.label}</span>
              </div>
            {/each}
          </div>
          {#each view.listRows as r}
            <div style="display:grid;grid-template-columns:{view.listCols};border-bottom:1px solid var(--line);background:{r.bg};border-left:{r.mark}">
              <div style="display:flex;align-items:center;gap:9px;padding:9px 13px;min-width:0">
                <span style="width:26px;height:26px;flex:none;border-radius:6px;background:var(--hover);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:600;color:var(--t2)">{r.mono}</span>
                <span style="display:flex;flex-direction:column;gap:2px;min-width:0;flex:1">
                  <span style="display:flex;align-items:center;gap:6px;min-width:0">
                    <span style="font-size:13px;font-weight:500;color:var(--t1);white-space:nowrap">{r.ticker}</span>
                    {#if r.badge}
                      <span style="display:inline-flex;align-items:center;height:16px;padding:0 6px;border-radius:4px;background:var(--accent-soft);color:var(--accent);font-size:9.5px;font-weight:600">{r.badge}</span>
                    {/if}
                  </span>
                  <span style="font-size:12px;color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">{r.name}</span>
                </span>
              </div>
              {#each r.cells as c}
                <div style="display:flex;align-items:center;justify-content:{c.justify};padding:9px 13px;min-width:0">
                  <span style="font-size:13px;font-weight:{c.weight};color:{c.color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{c.text}</span>
                </div>
              {/each}
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:9px 13px">
                <span style="display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:5px;background:{r.statusBg};color:{r.statusFg};font-size:11px;font-weight:500;white-space:nowrap">
                  <span style="width:5px;height:5px;border-radius:50%;background:currentColor"></span>{r.status}
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if view.isEmpty}
      <div style="display:flex;flex-direction:column;align-items:center;gap:7px;padding:52px 20px;border:1px solid var(--line);border-radius:8px;background:var(--card)">
        <span style="font-size:14px;font-weight:500;color:var(--t1)">No ex-dates in {view.monthLabel}</span>
        <span style="font-size:12.5px;color:var(--t3);text-align:center;max-width:420px;line-height:1.6">{view.emptyHint}</span>
        <button onclick={view.reset} style="margin-top:6px;height:30px;padding:0 12px;border:1px solid var(--line);border-radius:7px;background:transparent;font-size:12px;font-weight:500;color:var(--t1);cursor:pointer" class="hover11">Reset filters</button>
      </div>
    {/if}

    <span style="font-size:11px;line-height:1.55;color:var(--t3);max-width:960px;text-wrap:pretty">{view.footnote}</span>
  </main></div>

<style>
:global(html[data-theme="dark"]) { --chip-bg:var(--hover); --track:#3A3431; }
:global(:root) { --chip-bg:var(--hover); --track:#E4E1DF; }
.hover0:hover{border-color:var(--t3);color:var(--t2)}
.hover1:hover{background:var(--hover)}
.hover2:hover{background:var(--hover)}
.hover3:hover{background:var(--hover)}
.hover4:hover{background:var(--hover);text-decoration:none}
.hover5:hover{background:var(--hover)}
.hover6:hover{background:var(--hover)}
.hover7:hover{background:var(--hover)}
.hover8:hover{background:var(--hover);color:var(--t1)}
.hover9:hover{background:var(--hover)}
.hover10:hover{background:var(--hover);color:var(--t1)}
.hover11:hover{background:var(--hover)}
@media (max-width:1180px){[data-r="grid"]{min-width:1040px}[data-r="lwrap"]{min-width:980px}}
    @media (max-width:1080px){[data-r="stats"]{grid-template-columns:1fr 1fr!important}}
    @media (max-width:960px){
      
      
      
      [data-r="main"]{padding:16px 16px 104px!important}
    }
  
</style>
