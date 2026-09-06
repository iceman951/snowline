<script lang="ts">
  import { untrack } from "svelte";
  import Model from "$lib/presenters/PortfolioLab";
  import ChartTooltip from "$lib/components/ChartTooltip.svelte";
  import Metric from "$lib/components/Metric.svelte";
  import TopNav from "$lib/components/TopNav.svelte";
  import TwoLineCell from "$lib/components/TwoLineCell.svelte";
  let { engine }: { engine: any } = $props();
  const model = $derived(new Model(engine));
  const view: any = $derived.by(() => { model.revision; return model.renderVals(); });
  $effect(() => { const current = model; untrack(() => current.componentDidMount?.()); return () => current.componentWillUnmount?.(); });
</script>


<div style="min-height:100vh;background:var(--canvas);color:var(--t1);font-size:14px;line-height:1.45">

  <TopNav active="Tools" subActive="Portfolio Lab" portfolioName={engine.constants.portfolioName} holdingsCount={engine.totals().holdings} />

  <main data-r="main" data-screen-label="Tools — Portfolio Lab" style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:18px">

    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap">
      <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;position:relative">
          <h1 style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)">Portfolio Lab</h1>
          <span onmouseenter={view.titleTipOn} onmouseleave={view.titleTipOff} style="width:16px;height:16px;margin-top:6px;flex:none;border:1px solid var(--line);border-radius:50%;font-size:10px;font-weight:500;color:var(--t3);display:flex;align-items:center;justify-content:center;cursor:help" class="hover0" role="button" tabindex="0" onfocus={view.titleTipOn} onclick={view.titleTipOn} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); view.titleTipOn(event); } }} onblur={view.titleTipOff}>?</span>
          {#if view.titleTip}
            <span style="position:absolute;top:44px;left:0;z-index:40;width:400px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:10px 12px;font-size:11.5px;line-height:1.55;color:var(--t2)">{view.titleTipText}</span>
          {/if}
          <span style="font-size:13px;color:var(--t3);padding-top:6px">{view.portfolioName}</span>
        </div>
        <span style="font-size:12px;color:var(--t3)">{view.headNote}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <button onclick={view.onLoadMine} style="display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 13px;border:1px solid var(--accent);border-radius:7px;background:var(--accent-soft);color:var(--accent);font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V6M6 12l6-6 6 6M4 20h16"></path></svg>
          Load my portfolio
        </button>
        <a href="/tools/screener" style="display:inline-flex;align-items:center;height:32px;padding:0 13px;border:1px solid var(--line);border-radius:7px;color:var(--t1);font-size:12.5px;font-weight:500;text-decoration:none;white-space:nowrap" class="hover2">Screener</a>
        <a href="/analytics/metrics" style="display:inline-flex;align-items:center;height:32px;padding:0 13px;border:1px solid var(--line);border-radius:7px;color:var(--t1);font-size:12.5px;font-weight:500;text-decoration:none;white-space:nowrap" class="hover3">Metrics</a>
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px 12px">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        {#each view.tabs as t}
          <button onclick={t.onClick} style="display:flex;align-items:center;gap:9px;height:44px;padding:0 13px;border:1px solid {t.border};border-radius:8px;background:{t.bg};cursor:pointer;text-align:left" class="hover4">
            <span style="width:22px;height:22px;flex:none;border-radius:6px;background:{t.badgeBg};color:{t.badgeFg};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600">{t.badge}</span>
            <span style="display:flex;flex-direction:column;gap:1px;min-width:0">
              <span style="font-size:12.5px;font-weight:{t.weight};color:{t.color};white-space:nowrap">{t.name}</span>
              <span style="font-size:10.5px;color:var(--t3);white-space:nowrap">{t.meta}</span>
            </span>
          </button>
        {/each}
        {#if view.canAdd}
          <button onclick={view.onAddScenario} style="display:flex;align-items:center;gap:6px;height:44px;padding:0 13px;border:1px dashed var(--line);border-radius:8px;background:transparent;color:var(--t2);font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>
            Duplicate to compare
          </button>
        {/if}
      </div>
      <div style="flex:1"></div>
      {#if view.canRemove}
        <button onclick={view.onRemoveScenario} style="height:30px;padding:0 12px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--t2);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover6">Delete {view.activeName}</button>
      {/if}
      <button onclick={view.onResetAll} style="height:30px;padding:0 12px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--t2);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover7">Start over</button>
    </div>

    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:13px 16px">
      <span style="display:flex;align-items:center;gap:9px">
        <span style="font-size:12px;font-weight:500;color:var(--t2);white-space:nowrap">Scenario</span>
        <input value="{view.nameDraft}" oninput={view.onName} style="width:170px;height:30px;padding:0 10px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--t1);font-size:13px;font-weight:500;outline:none">
      </span>
      <span style="display:flex;align-items:center;gap:9px">
        <span style="font-size:12px;font-weight:500;color:var(--t2);white-space:nowrap">Starting amount</span>
        <span style="display:flex;align-items:stretch;width:130px;border:1px solid var(--line);border-radius:7px;overflow:hidden">
          <span style="display:flex;align-items:center;padding:0 2px 0 10px;font-size:13px;color:var(--t3)">$</span>
          <input value="{view.amountDraft}" oninput={view.onAmount} inputmode="decimal" style="flex:1;min-width:0;height:30px;padding:0 10px 0 3px;border:none;background:transparent;color:var(--t1);font-size:13px;font-weight:500;outline:none">
        </span>
      </span>
      <span style="display:flex;align-items:center;gap:9px">
        <span style="font-size:12px;font-weight:500;color:var(--t2);white-space:nowrap">Monthly contribution</span>
        <span style="display:flex;align-items:stretch;width:112px;border:1px solid var(--line);border-radius:7px;overflow:hidden">
          <span style="display:flex;align-items:center;padding:0 2px 0 10px;font-size:13px;color:var(--t3)">$</span>
          <input value="{view.monthlyDraft}" oninput={view.onMonthly} inputmode="decimal" style="flex:1;min-width:0;height:30px;padding:0 10px 0 3px;border:none;background:transparent;color:var(--t1);font-size:13px;outline:none">
        </span>
      </span>

      <span style="display:flex;align-items:center;gap:7px">
        <span style="font-size:12px;font-weight:500;color:var(--t2);white-space:nowrap">Window</span>
        {#each view.windowPickers as w}
          <span style="position:relative">
            <button onclick={w.onToggle} style="display:flex;align-items:center;gap:8px;height:30px;padding:0 10px;border:1px solid {w.border};border-radius:7px;background:transparent;color:var(--t1);font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover8">
              {w.label}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"></path></svg>
            </button>
            {#if w.open}
              <span style="position:absolute;top:36px;left:0;z-index:60;display:block;width:150px;max-height:250px;overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:5px;animation:menuIn .12s ease-out">
                {#each w.options as o}
                  <button onclick={o.onClick} style="display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;height:32px;padding:0 9px;border:none;border-radius:6px;background:{o.bg};color:{o.color};font-size:12.5px;font-weight:{o.weight};cursor:pointer;text-align:left" class="hover9">
                    {o.label}
                    <span style="font-size:11px;color:var(--accent);opacity:{o.check}">✓</span>
                  </button>
                {/each}
              </span>
            {/if}
          </span>
        {/each}
      </span>

      <button onclick={view.togReinvest} style="display:flex;align-items:center;gap:8px;height:30px;padding:0 11px 0 9px;border:1px solid {view.reinvestBorder};border-radius:7px;background:{view.reinvestBg};color:var(--t1);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover10">
        <span style="width:15px;height:15px;flex:none;border:1px solid {view.reinvestBoxBorder};border-radius:4px;background:{view.reinvestBoxBg};display:flex;align-items:center;justify-content:center;color:var(--on-accent);font-size:10px;font-weight:700">{view.reinvestMark}</span>
        Reinvest dividends
      </button>
    </div>

    <div data-r="stats" style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:0;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
      {#each view.stats as s}
        <div style="padding:16px 18px;border-left:{s.border}">
          <Metric label={s.label} primary={s.primary} primaryTone={s.tone} secondary={s.secondary} secondaryNote={s.note} tip={s.tip} help={true} />
        </div>
      {/each}
    </div>

    <div data-r="two" style="display:grid;grid-template-columns:minmax(0,1.55fr) minmax(340px,1fr);gap:18px;align-items:start">

      <div style="display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:14px 18px;border-bottom:1px solid var(--line)">
          <span style="display:flex;flex-direction:column;gap:3px">
            <span style="font-size:13px;font-weight:600;color:var(--t1)">{view.chartTitle}</span>
            <span style="font-size:11.5px;color:var(--t3)">{view.chartSpan}</span>
          </span>
          <span style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
            {#each view.chartLegend as l}
              <span style="display:flex;align-items:center;gap:7px;white-space:nowrap">
                <span style="width:14px;height:0;border-top:{l.stroke}"></span>
                <span style="font-size:11px;color:var(--t3)">{l.label}</span>
                <span style="font-size:12px;font-weight:500;color:{l.color}">{l.value}</span>
              </span>
            {/each}
          </span>
        </div>

        {#if view.hasRun}
          <div style="padding:18px 20px 14px 52px">
            <div style="position:relative" onmouseleave={view.chartLeave} role="group">
              <svg role="img" aria-label="Portfolio history chart" viewBox="0 0 1000 260" preserveAspectRatio="none" style="width:100%;height:260px;display:block" onmousemove={view.chartMove}>
                <defs>
                  <linearGradient id="labFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.18"></stop>
                    <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"></stop>
                  </linearGradient>
                </defs>
                {#each view.grid as g}
                  <line x1="0" y1="{g.y}" x2="1000" y2="{g.y}" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 5" vector-effect="non-scaling-stroke"></line>
                {/each}
                <path d="{view.areaPath}" fill="url(#labFill)"></path>
                {#if view.showInvested}
                  <path d="{view.investedPath}" fill="none" stroke="var(--t3)" stroke-width="1.4" stroke-dasharray="2 4" vector-effect="non-scaling-stroke" stroke-linejoin="round"></path>
                {/if}
                {#if view.showBench}
                  <path d="{view.benchPath}" fill="none" stroke="var(--grey-series)" stroke-width="1.7" stroke-dasharray="5 4" vector-effect="non-scaling-stroke" stroke-linejoin="round"></path>
                {/if}
                <path d="{view.linePath}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"></path>
                {#if view.ddBand}
                  <rect x="{view.ddX}" y="4" width="{view.ddW}" height="252" fill="var(--neg)" opacity="0.06"></rect>
                {/if}
                {#if view.hover}
                  <line x1="{view.cursorX}" y1="0" x2="{view.cursorX}" y2="260" stroke="var(--t3)" stroke-width="1" vector-effect="non-scaling-stroke"></line>
                {/if}
              </svg>
              {#each view.grid as g}
                <span style="position:absolute;left:-52px;top:{g.top};transform:translateY(-50%);width:44px;text-align:right;font-size:10px;color:var(--t3);pointer-events:none">{g.label}</span>
              {/each}
              {#if view.hover}
                <span style="position:absolute;left:{view.dotLeft};top:{view.dotTop};transform:translate(-50%,-50%);width:9px;height:9px;border-radius:50%;background:var(--accent);border:2px solid var(--card);pointer-events:none"></span>
              {/if}
              {#if view.tip}
                <div style="position:absolute;top:6px;left:{view.tipLeft};transform:translateX(-50%);z-index:9;pointer-events:none">
                  <ChartTooltip tip={view.tip} />
                </div>
              {/if}
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:9px">
              {#each view.xTicks as x}
                <span style="font-size:10px;color:var(--t3);white-space:nowrap">{x.label}</span>
              {/each}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding:12px 18px;border-top:1px solid var(--line)">
            {#each view.chartFoot as f}
              <span style="display:flex;align-items:baseline;gap:7px;white-space:nowrap">
                <span style="font-size:11.5px;color:var(--t3)">{f.label}</span>
                <span style="font-size:12.5px;font-weight:500;color:{f.color}">{f.value}</span>
              </span>
            {/each}
          </div>
        {/if}
        {#if view.noRun}
          <div style="display:flex;flex-direction:column;align-items:center;gap:7px;padding:70px 24px">
            <span style="font-size:13.5px;font-weight:500;color:var(--t1)">{view.noRunTitle}</span>
            <span style="font-size:12px;color:var(--t3);text-align:center;max-width:420px;line-height:1.6">{view.noRunBody}</span>
          </div>
        {/if}
      </div>

      <div data-r="panel" style="position:sticky;top:74px;display:flex;flex-direction:column;gap:18px">
        <div style="display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 16px;border-bottom:1px solid var(--line)">
            <span style="font-size:13px;font-weight:600;color:var(--t1)">Weights</span>
            <span style="display:flex;align-items:center;gap:7px">
              <span style="display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:999px;background:{view.sumBg};color:{view.sumFg};font-size:11.5px;font-weight:500;white-space:nowrap">{view.sumLabel}</span>
              {#if view.sumOff}
                <button onclick={view.onNormalise} style="height:24px;padding:0 10px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--t1);font-size:11.5px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover11">Scale to 100%</button>
              {/if}
            </span>
          </div>

          {#each view.weightRows as w}
            <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--line)">
              <span style="width:26px;height:26px;flex:none;border-radius:6px;background:var(--hover);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:600;color:var(--t2)">{w.mono}</span>
              <span style="display:flex;flex-direction:column;gap:2px;min-width:0;flex:1">
                <span style="display:flex;align-items:baseline;gap:7px;min-width:0">
                  <span style="font-size:12.5px;font-weight:500;color:var(--t1)">{w.ticker}</span>
                  <span style="font-size:10.5px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{w.name}</span>
                </span>
                <span style="font-size:10.5px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{w.anchor}</span>
              </span>
              <span style="display:flex;align-items:stretch;width:78px;flex:none;border:1px solid var(--line);border-radius:7px;overflow:hidden">
                <input value="{w.draft}" oninput={w.onChange} inputmode="decimal" style="flex:1;min-width:0;height:28px;padding:0 3px 0 9px;border:none;background:transparent;color:var(--t1);font-size:12.5px;font-weight:500;outline:none;text-align:right">
                <span style="display:flex;align-items:center;padding:0 8px 0 2px;font-size:11.5px;color:var(--t3)">%</span>
              </span>
              <button onclick={w.onRemove} title="Remove" style="width:26px;height:26px;flex:none;display:flex;align-items:center;justify-content:center;border:none;border-radius:6px;background:transparent;color:var(--t3);cursor:pointer" class="hover12">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>
              </button>
            </div>
          {/each}

          {#if view.noWeights}
            <div style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:26px 18px;border-bottom:1px solid var(--line)">
              <span style="font-size:12.5px;font-weight:500;color:var(--t1)">Nothing in this portfolio yet</span>
              <span style="font-size:11.5px;color:var(--t3);text-align:center;line-height:1.55">Search below to add a ticker, or load the 12 positions you already hold.</span>
            </div>
          {/if}

          <div style="display:flex;flex-direction:column;gap:9px;padding:13px 16px">
            <div style="display:flex;align-items:center;gap:8px">
              <input value="{view.query}" oninput={view.onQuery} placeholder="Add a ticker or name…" style="flex:1;min-width:0;height:32px;padding:0 11px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--t1);font-size:12.5px;outline:none">
              <button onclick={view.onEven} style="height:32px;padding:0 11px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--t1);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap" class="hover13">Even split</button>
            </div>
            {#each view.picks as p}
              <button onclick={p.onClick} style="display:flex;align-items:center;gap:9px;width:100%;padding:7px 8px;border:none;border-radius:7px;background:transparent;cursor:pointer;text-align:left" class="hover14">
                <span style="width:24px;height:24px;flex:none;border-radius:6px;background:var(--hover);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;color:var(--t2)">{p.mono}</span>
                <span style="display:flex;flex-direction:column;gap:1px;min-width:0;flex:1">
                  <span style="display:flex;align-items:baseline;gap:6px;min-width:0">
                    <span style="font-size:12.5px;font-weight:500;color:var(--t1)">{p.ticker}</span>
                    {#if p.tag}
                      <span style="font-size:9.5px;font-weight:500;color:var(--accent);border:1px solid var(--accent);border-radius:999px;padding:0 5px">{p.tag}</span>
                    {/if}
                  </span>
                  <span style="font-size:10.5px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{p.sub}</span>
                </span>
                <span style="font-size:12px;font-weight:500;color:var(--t2);white-space:nowrap">{p.yield}</span>
              </button>
            {/each}
            {#if view.noPicks}
              <span style="font-size:11.5px;color:var(--t3);padding:4px 2px">{view.noPicksNote}</span>
            {/if}
          </div>
        </div>

        <div style="display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 16px;border-bottom:1px solid var(--line)">
            <span style="font-size:13px;font-weight:600;color:var(--t1)">What these numbers rest on</span>
            <span style="font-size:11.5px;color:var(--t3)">{view.honestyNote}</span>
          </div>
          {#each view.honesty as h}
            <div style="display:flex;flex-direction:column;gap:3px;padding:12px 16px 12px 13px;border-bottom:1px solid var(--line);border-left:3px solid {h.tone}">
              <span style="font-size:12.5px;font-weight:500;color:var(--t1)">{h.title}</span>
              <span style="font-size:11.5px;line-height:1.55;color:var(--t2);text-wrap:pretty">{h.body}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:13px 16px;border-bottom:1px solid var(--line)">
        <span style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:600;color:var(--t1)">Scenarios side by side</span>
          <span style="font-size:11.5px;color:var(--t3)">{view.cmpNote}</span>
        </span>
      </div>
      <div style="max-width:100%;overflow-x:auto;overscroll-behavior-x:contain">
        <div data-r="cmpwrap">
          <div style="display:grid;grid-template-columns:{view.cmpCols};border-bottom:1px solid var(--line)">
            <div style="padding:10px 16px"></div>
            {#each view.cmpHead as h}
              <div style="display:flex;flex-direction:column;gap:2px;padding:10px 16px;background:{h.bg};border-left:1px solid var(--line)">
                <span style="font-size:12.5px;font-weight:600;color:{h.color};white-space:nowrap">{h.name}</span>
                <span style="font-size:10.5px;color:var(--t3);white-space:nowrap">{h.meta}</span>
              </div>
            {/each}
          </div>
          {#each view.cmpRows as r}
            <div style="display:grid;grid-template-columns:{view.cmpCols};border-bottom:1px solid var(--line);background:{r.bg}">
              <div style="display:flex;flex-direction:column;gap:1px;padding:10px 16px">
                <span style="font-size:12.5px;color:var(--t1)">{r.label}</span>
                {#if r.sub}
                  <span style="font-size:10.5px;color:var(--t3)">{r.sub}</span>
                {/if}
              </div>
              {#each r.cells as c}
                <div style="display:flex;align-items:center;padding:10px 16px;border-left:1px solid var(--line);background:{c.bg}">
                  <span style="font-size:12.5px;font-weight:{c.weight};color:{c.color};white-space:nowrap">{c.value}</span>
                </div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:13px 16px;border-bottom:1px solid var(--line)">
        <span style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:600;color:var(--t1)">{view.legTitle}</span>
          <span style="font-size:11.5px;color:var(--t3)">{view.legNote}</span>
        </span>
      </div>
      <div style="max-width:100%;overflow-x:auto;overscroll-behavior-x:contain">
        <div data-r="legwrap">
          <div style="display:grid;grid-template-columns:{view.legCols};border-bottom:1px solid var(--line)">
            {#each view.legHead as h}
              <div style="display:flex;align-items:center;justify-content:{h.justify};padding:9px 13px">
                <span style="font-size:12px;font-weight:500;color:var(--t2);white-space:nowrap">{h.label}</span>
              </div>
            {/each}
          </div>
          {#each view.legRows as r}
            <div style="display:grid;grid-template-columns:{view.legCols};border-bottom:1px solid var(--line)">
              <div style="display:flex;align-items:center;gap:9px;padding:11px 13px;min-width:0">
                <span style="width:26px;height:26px;flex:none;border-radius:6px;background:var(--hover);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:600;color:var(--t2)">{r.mono}</span>
                <span style="display:block;min-width:0;flex:1;overflow:hidden">
                  <TwoLineCell primary={r.ticker} secondary={r.name} align="left" />
                </span>
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 13px;min-width:0">
                <TwoLineCell primary={r.weight} secondary={r.weightSub} align="right" />
              </div>
              <div style="display:flex;align-items:center;padding:11px 13px;min-width:0;overflow:hidden">
                <span style="display:block;min-width:0;flex:1;overflow:hidden">
                  <TwoLineCell primary={r.anchor} secondary={r.anchorSub} align="left" />
                </span>
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 13px;min-width:0">
                <TwoLineCell primary={r.ends} secondary={r.endsSub} tone={r.endsTone} align="right" />
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:11px 13px;min-width:0">
                <TwoLineCell primary={r.dividends} secondary={r.dividendsSub} align="right" />
              </div>
            </div>
          {/each}
          {#if view.hasRun}
            <div style="display:grid;grid-template-columns:{view.legCols};border-top:1px solid var(--t3)">
              <div style="display:flex;align-items:center;padding:12px 13px;min-width:0">
                <TwoLineCell primary="Total" secondary={view.legTotalSub} align="left" />
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:12px 13px;min-width:0">
                <TwoLineCell primary={view.legTotalWeight} secondary={view.legTotalWeightSub} align="right" />
              </div>
              <div style="display:flex;align-items:center;padding:12px 13px">
                <span style="font-size:11.5px;color:var(--t3);text-wrap:pretty">{view.legTotalAnchor}</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:12px 13px;min-width:0">
                <TwoLineCell primary={view.legTotalEnds} secondary={view.legTotalEndsSub} tone={view.legTotalTone} align="right" />
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:12px 13px;min-width:0">
                <TwoLineCell primary={view.legTotalDiv} secondary={view.legTotalDivSub} align="right" />
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <span style="font-size:11px;line-height:1.55;color:var(--t3);max-width:1000px;text-wrap:pretty">{view.footnote}</span>
  </main></div>

<style>
:global(html[data-theme="dark"]) { --scrim:rgba(0,0,0,.6); --track:#3A3431; --tick:#3A3431; }
:global(:root) { --scrim:rgba(12,12,12,.42); --track:#E4E1DF; --tick:#CFCAC6; }
.hover0:hover{border-color:var(--t3);color:var(--t2)}
.hover1:hover{background:var(--accent-tint)}
.hover2:hover{background:var(--hover);text-decoration:none}
.hover3:hover{background:var(--hover);text-decoration:none}
.hover4:hover{background:var(--hover)}
.hover5:hover{background:var(--hover);color:var(--t1)}
.hover6:hover{background:var(--hover);color:var(--neg)}
.hover7:hover{background:var(--hover);color:var(--t1)}
.hover8:hover{background:var(--hover)}
.hover9:hover{background:var(--hover)}
.hover10:hover{background:var(--hover)}
.hover11:hover{background:var(--hover)}
.hover12:hover{background:var(--hover);color:var(--neg)}
.hover13:hover{background:var(--hover)}
.hover14:hover{background:var(--hover)}
@media (max-width:1320px){
      [data-r="two"]{grid-template-columns:minmax(0,1fr)!important}
      [data-r="panel"]{position:static!important}
    }
    @media (max-width:1180px){[data-r="cmpwrap"]{min-width:900px}[data-r="legwrap"]{min-width:940px}}
    @media (max-width:1080px){[data-r="stats"]{grid-template-columns:1fr 1fr 1fr!important}}
    @media (max-width:960px){
      [data-r="stats"]{grid-template-columns:1fr 1fr!important}
      
      [data-r="main"]{padding:16px 16px 104px!important}
    }
  
</style>
