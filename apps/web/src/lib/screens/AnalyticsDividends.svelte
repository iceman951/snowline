<script lang="ts">
  import { untrack } from "svelte";
  import Model from "$lib/presenters/AnalyticsDividends";
  import AnalyticsSubnav from "$lib/components/AnalyticsSubnav.svelte";
  import ChartTooltip from "$lib/components/ChartTooltip.svelte";
  import DonutBreakdown from "$lib/components/DonutBreakdown.svelte";
  import Metric from "$lib/components/Metric.svelte";
  import TopNav from "$lib/components/TopNav.svelte";
  import TwoLineCell from "$lib/components/TwoLineCell.svelte";
  let { engine }: { engine: any } = $props();
  const model = $derived(new Model(engine));
  const view: any = $derived.by(() => { model.revision; return model.renderVals(); });
  $effect(() => { const current = model; untrack(() => current.componentDidMount?.()); return () => current.componentWillUnmount?.(); });
</script>


<div style="min-height:100vh;background:var(--canvas);color:var(--t1);font-size:14px;line-height:1.45">

  <TopNav active="Analytics" subActive="Dividends" portfolioName={engine.constants.portfolioName} holdingsCount={engine.totals().holdings} />

  <main data-r="main" data-screen-label="Analytics — Dividends" style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:22px">

    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
        <div style="display:flex;align-items:center;gap:9px">
          <h1 style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)">Dividends</h1>
          <span style="font-size:13px;color:var(--t3);padding-top:6px">{view.portfolioName}</span>
        </div>
        <div style="display:flex;align-items:center;gap:9px;font-size:12px;color:var(--t3)">
          <span>{view.headPayers}</span>
          <span style="width:1px;height:10px;background:var(--line)"></span>
          <span>{view.headTax}</span>
          <span style="width:1px;height:10px;background:var(--line)"></span>
          <span>{view.headNext}</span>
        </div>
      </div>
    </div>

    <AnalyticsSubnav active="Dividends" />

    <div data-r="mrow" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">
      <div style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:20px;display:flex;flex-direction:column;gap:14px">
        <Metric label="Yield" tip="Forward 12-month income at today's prices, before withholding tax." primary={view.yieldPrimary} secondary={view.yieldSecondary} secondaryNote="after tax" />
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--t3)">
          <span>{view.yieldOnCost}</span>
          <span style="width:1px;height:10px;background:var(--line)"></span>
          <span>{view.yieldSpread}</span>
        </div>
      </div>
      <div style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:20px;display:flex;flex-direction:column;gap:14px">
        <Metric label="Dividends" tip="Forward gross income over the next twelve months." primary={view.divPrimary} primaryDelta={view.divDelta} deltaTone="pos" secondary={view.divSecondary} secondaryNote="monthly average" />
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--t3)">
          <span>{view.divNet}</span>
          <span style="width:1px;height:10px;background:var(--line)"></span>
          <span>{view.divCount}</span>
        </div>
      </div>
    </div>

    <div data-r="charts" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">
      {#each view.charts as c}
        <div style="grid-column:{c.span};background:var(--card);border:1px solid var(--line);border-radius:8px;display:flex;flex-direction:column">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 20px;border-bottom:1px solid var(--line);flex-wrap:wrap">
            <div style="display:flex;align-items:baseline;gap:10px;min-width:0">
              <span style="font-size:14px;font-weight:600;color:var(--t1)">{c.title}</span>
              <span style="font-size:12px;color:var(--t3)">{c.subtitle}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              {#each c.legend as l}
                <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t3)">
                  <span style="width:8px;height:8px;border-radius:1px;background:{l.color};display:inline-block"></span>{l.label}
                </span>
              {/each}
              {#each c.controls as ctl}
                <div style="position:relative">
                  <button onclick={ctl.onToggle} style="display:flex;align-items:center;gap:7px;height:30px;padding:0 10px;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--t1);font-size:12px;cursor:pointer;white-space:nowrap" class="hover0">{ctl.value}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"></path></svg>
                  </button>
                  {#if ctl.open}
                    <div style="position:absolute;top:36px;right:0;z-index:50;width:194px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px;animation:menuIn .12s ease-out">
                      {#each ctl.options as o}
                        <button onclick={o.onClick} style="display:flex;align-items:center;justify-content:space-between;width:100%;height:38px;padding:0 10px;border:none;border-radius:6px;background:transparent;color:var(--t1);font-size:13px;cursor:pointer;text-align:left" class="hover1">
                          <span>{o.label}</span><span style="color:var(--accent);font-size:12px;opacity:{o.check}">✓</span>
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>

          <div style="padding:18px 20px 20px;display:flex;flex-direction:column;gap:4px">
            <div style="position:relative">
              <div style="position:relative">
                <svg viewBox="0 0 624 154" style="width:100%;height:auto;display:block">
                  {#each c.grid as g}
                    <line x1="46" y1="{g.y}" x2="616" y2="{g.y}" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 4"></line>
                  {/each}
                  {#if c.zeroY}
                    <line x1="46" y1="{c.zeroY}" x2="616" y2="{c.zeroY}" stroke="var(--t3)" stroke-width="1"></line>
                  {/if}
                  {#each c.bars as b}
                    <rect x="{b.sx}" y="10" width="{b.sw}" height="138" fill="var(--hover)" opacity="{b.hop}" onmouseenter={b.onEnter} onmouseleave={b.onLeave} role="button" tabindex="0" onfocus={b.onEnter} onclick={b.onEnter} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); b.onEnter(event); } }} onblur={b.onLeave}></rect>
                    {#each b.parts as p}
                      <rect x="{p.x}" y="{p.y}" width="{p.w}" height="{p.h}" fill="{p.fill}" pointer-events="none"></rect>
                    {/each}
                    {#if b.marker}
                      <line x1="{b.markerX1}" y1="{b.markerY}" x2="{b.markerX2}" y2="{b.markerY}" stroke="var(--t1)" stroke-width="1.6" pointer-events="none"></line>
                    {/if}
                  {/each}
                </svg>
                {#each c.grid as g}
                  <span style="position:absolute;left:0;top:{g.top};width:6.2%;transform:translateY(-50%);text-align:right;font-size:10px;color:var(--t3);pointer-events:none">{g.label}</span>
                {/each}
              </div>
              <div style="display:flex;margin:5px 1.28% 0 7.37%">
                {#each c.bars as b}
                  <span style="flex:1;min-width:0;padding:0 1px;text-align:center;font-size:10px;color:{b.labelColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{b.label}</span>
                {/each}
              </div>
              {#if c.tip}
                <div style="position:absolute;top:0;left:{c.tipLeft};transform:translateX(-50%);z-index:9;pointer-events:none">
                  <ChartTooltip tip={c.tip} />
                </div>
              {/if}
            </div>
            {#if c.footer}
              <span style="font-size:11px;color:var(--t3);padding-left:7.37%">{c.footer}</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <DonutBreakdown title="Passive income diversification" subtitle={view.incomeSubtitle} rows={view.incomeRows} centerLabel="Forward income" unit="payers" nameHeader="Asset" valueHeader="Share / gross a year" listHeight="330px" footer={view.incomeFooter} />

    <div style="background:var(--card);border:1px solid var(--line);border-radius:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 20px;border-bottom:1px solid var(--line)">
        <div style="display:flex;align-items:baseline;gap:10px">
          <span style="font-size:14px;font-weight:600;color:var(--t1)">Dividend rating</span>
          <span style="font-size:12px;color:var(--t3)">{view.ratingSubtitle}</span>
        </div>
        <span style="font-size:11px;color:var(--t3)">Derived from payout headroom, growth, structure and yield</span>
      </div>
      <div data-r="rating" style="display:grid;grid-template-columns:274px minmax(0,1fr);gap:24px;padding:20px">
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="position:relative;width:100%;max-width:240px;align-self:center">
            <svg viewBox="0 0 240 240" style="width:100%;height:auto;display:block">
              <circle cx="120" cy="120" r="76" fill="none" stroke="var(--line)" stroke-width="20"></circle>
              {#each view.ratingSegs as s}
                <circle cx="120" cy="120" r="76" fill="none" stroke="{s.color}" stroke-width="{s.sw}" stroke-dasharray="{s.dash}" stroke-dashoffset="{s.offset}" opacity="{s.op}" transform="rotate(-90 120 120)" onmouseenter={s.onEnter} onmouseleave={s.onLeave} style="transition:opacity .15s ease,stroke-width .15s ease" role="button" tabindex="0" onfocus={s.onEnter} onclick={s.onEnter} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); s.onEnter(event); } }} onblur={s.onLeave}></circle>
              {/each}
            </svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;pointer-events:none">
              <span style="font-size:20px;font-weight:600;letter-spacing:-0.02em;color:var(--t1)">{view.ratingCenterValue}</span>
              <span style="font-size:11px;color:var(--t2)">{view.ratingCenterLabel}</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:7px">
            {#each view.ratingLegend as l}
              <div onmouseenter={l.onEnter} onmouseleave={l.onLeave} style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 6px;border-radius:5px;background:{l.bg}" role="button" tabindex="0" onfocus={l.onEnter} onclick={l.onEnter} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); l.onEnter(event); } }} onblur={l.onLeave}>
                <span style="display:flex;align-items:center;gap:8px;min-width:0">
                  <span style="width:9px;height:9px;flex:none;border-radius:1px;background:{l.color}"></span>
                  <span style="font-size:12px;color:var(--t1);white-space:nowrap">{l.label}</span>
                  <span style="font-size:11px;color:var(--t3);white-space:nowrap">{l.count}</span>
                </span>
                <span style="font-size:12px;color:var(--t2);white-space:nowrap">{l.pct}</span>
              </div>
            {/each}
          </div>
        </div>

        <div data-r="rtable" style="display:flex;flex-direction:column;min-width:0">
          <div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1.1fr) minmax(0,1.1fr) 168px;gap:12px;padding-bottom:9px;border-bottom:1px solid var(--line)">
            <span style="font-size:12px;font-weight:500;color:var(--t2)">Asset</span>
            <span style="font-size:12px;font-weight:500;color:var(--t2);text-align:right">Value / Invested</span>
            <span style="font-size:12px;font-weight:500;color:var(--t2);text-align:right">Annual dividends</span>
            <span style="font-size:12px;font-weight:500;color:var(--t2);text-align:right">Dividend rating</span>
          </div>
          {#each view.ratingRows as r}
            <div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1.1fr) minmax(0,1.1fr) 168px;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)">
              <span style="display:flex;align-items:center;gap:10px;min-width:0">
                <span style="width:28px;height:28px;flex:none;border-radius:6px;background:var(--hover);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:var(--t2)">{r.mono}</span>
                <span style="display:flex;flex-direction:column;gap:1px;min-width:0">
                  <span style="font-size:13px;font-weight:500;color:var(--t1);white-space:nowrap">{r.ticker}</span>
                  <span style="font-size:12px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{r.name}</span>
                </span>
              </span>
              <TwoLineCell align="right" primary={r.value} secondary={r.invested} />
              <TwoLineCell align="right" primary={r.annual} secondary={r.annualNet} />
              <span style="display:flex;align-items:center;justify-content:flex-end;gap:8px">
                {#if r.warn}
                  <span title="{r.warnText}" style="display:flex;align-items:center;color:var(--tag-fg)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l9 16H3z"></path><path d="M12 10v4M12 17h.01"></path></svg>
                  </span>
                {/if}
                <span style="font-size:12px;color:var(--t2);white-space:nowrap">{r.label}</span>
                <span style="min-width:34px;text-align:center;font-size:12px;font-weight:600;color:{r.scoreColor};background:var(--chip-bg);border:1px solid var(--line);border-radius:5px;padding:3px 7px">{r.score}</span>
              </span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </main></div>

<style>
:global(:root) { --chip-bg:var(--hover); }
.hover0:hover{background:var(--hover)}
.hover1:hover{background:var(--hover)}
@media (max-width:1180px){
      [data-r="mrow"]{grid-template-columns:minmax(0,1fr)!important}
      [data-r="charts"]{grid-template-columns:minmax(0,1fr)!important}
      [data-r="charts"] > div{grid-column:span 1!important}
      [data-r="rating"]{grid-template-columns:minmax(0,1fr)!important}
      
    }
    @media (max-width:960px){
      
      
      
      [data-r="main"]{padding:16px 16px 104px!important}
      
      [data-r="rtable"]{overflow-x:auto!important}
    }
  
</style>
