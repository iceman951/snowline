<!--
  Portfolio → My goal. Port of the bundle's MyGoal.dc.html.

  The Dashboard's goal card reads the same projection this screen configures,
  so nothing here may be hardcoded to one target, mode or horizon. Saving
  writes the config to the API and the whole screen recomputes from it.
-->
<script lang="ts">
  import { fmt, type GoalConfig } from '@snowline/core';
  import ChartTooltip from '$lib/components/ChartTooltip.svelte';
  import TopNav from '$lib/components/TopNav.svelte';
  import { GEO, buildAxis } from '$lib/goal-chart';
  import type { GoalScreenPayload } from '$lib/api';
  import type { TooltipData } from '$lib/charts';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let saved = $state<GoalScreenPayload | null>(null);
  const S = $derived(saved ?? data.screen);
  const K = $derived(S.constants);
  const pr = $derived(S.projection);
  const cfg = $derived(pr.cfg);
  const income = $derived(pr.mode === 'income');

  /* ---- the draft the form edits, seeded from the saved config ----------- */

  type Draft = {
    mode: 'value' | 'income';
    valueTarget: number;
    incomeTarget: number;
    byYear: number;
    monthlyContribution: number;
    contributionGrowth: number;
    expectedReturn: number;
    safeReturn: number;
    dividendGrowth: number;
    inflation: number;
    taxDrag: number;
    reinvestDividends: boolean;
  };

  const draftFrom = (c: GoalConfig): Draft => ({
    mode: c.mode,
    valueTarget: c.valueTarget,
    incomeTarget: c.incomeTarget,
    byYear: c.byYear,
    monthlyContribution: c.monthlyContribution,
    // Rates are stored as fractions and edited as percentages.
    contributionGrowth: +(c.contributionGrowth * 100).toFixed(2),
    expectedReturn: +(c.expectedReturn * 100).toFixed(2),
    safeReturn: +(c.safeReturn * 100).toFixed(2),
    dividendGrowth: +(c.dividendGrowth * 100).toFixed(2),
    inflation: +(c.inflation * 100).toFixed(2),
    taxDrag: +(c.taxDrag * 100).toFixed(2),
    reinvestDividends: c.reinvestDividends
  });

  const toConfig = (d: Draft) => ({
    mode: d.mode,
    valueTarget: Number(d.valueTarget) || 1,
    incomeTarget: Number(d.incomeTarget) || 1,
    byYear: Number(d.byYear),
    monthlyContribution: Number(d.monthlyContribution) || 0,
    contributionGrowth: (Number(d.contributionGrowth) || 0) / 100,
    expectedReturn: (Number(d.expectedReturn) || 0) / 100,
    safeReturn: (Number(d.safeReturn) || 0) / 100,
    dividendGrowth: (Number(d.dividendGrowth) || 0) / 100,
    inflation: (Number(d.inflation) || 0) / 100,
    taxDrag: (Number(d.taxDrag) || 0) / 100,
    reinvestDividends: d.reinvestDividends
  });

  // svelte-ignore state_referenced_locally
  let draft = $state<Draft>(draftFrom(data.screen.projection.cfg));

  const dirty = $derived(JSON.stringify(toConfig(draft)) !== JSON.stringify(toConfig(draftFrom(cfg))));

  let busy = $state(false);
  let justSaved = $state(false);

  async function save() {
    busy = true;
    try {
      const res = await fetch('/api/goal/config', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toConfig(draft))
      });
      if (res.ok) {
        const screen = await fetch('/api/screens/goal');
        if (screen.ok) {
          saved = await screen.json();
          draft = draftFrom((saved as GoalScreenPayload).projection.cfg);
          justSaved = true;
          setTimeout(() => (justSaved = false), 3200);
        }
      }
    } finally {
      busy = false;
    }
  }

  async function reset() {
    busy = true;
    try {
      await fetch('/api/goal/config', { method: 'DELETE' });
      const screen = await fetch('/api/screens/goal');
      if (screen.ok) {
        saved = await screen.json();
        draft = draftFrom((saved as GoalScreenPayload).projection.cfg);
        justSaved = false;
      }
    } finally {
      busy = false;
    }
  }

  /* ---- chart ------------------------------------------------------------ */

  let scale = $state<'Log' | 'Linear'>('Log');
  let hoverN = $state<number | null>(null);
  let step = $state<1 | 2 | 5>(1);
  let openReturns = $state(false);
  let openOther = $state(false);
  let paramsOpen = $state(false);
  let chipsOpen = $state(false);

  const axis = $derived(
    buildAxis([...pr.P, ...pr.S, pr.target, pr.current], pr.span, scale === 'Log', pr.target)
  );

  const portPoints = $derived(
    pr.P.map((v, n) => `${axis.xs(n).toFixed(1)},${axis.ys(v).toFixed(1)}`).join(' ')
  );
  const safePoints = $derived(
    pr.S.map((v, n) => `${axis.xs(n).toFixed(1)},${axis.ys(v).toFixed(1)}`).join(' ')
  );

  const marks = $derived(
    [
      { n: pr.crossP, year: pr.crossPYear, color: 'var(--accent)' },
      { n: pr.crossS, year: pr.crossSYear, color: 'var(--t2)' }
    ]
      .filter((m): m is { n: number; year: number; color: string } => m.n !== null)
      .map((m) => ({
        x: (axis.xs(m.n) - 4.5).toFixed(1),
        y: (axis.ys(pr.target) - 4.5).toFixed(1),
        left: `${((axis.xs(m.n) / GEO.W) * 100).toFixed(2)}%`,
        labelTop: `${(((axis.ys(pr.target) + 9) / GEO.H) * 100).toFixed(2)}%`,
        color: m.color,
        label: String(m.year)
      }))
  );

  const hoverRow = $derived(hoverN === null ? null : pr.years[hoverN]);
  const hoverFrac = $derived(hoverRow ? axis.xs(hoverRow.n) / GEO.W : 0);

  const hoverTip = $derived.by((): TooltipData | null => {
    const r = hoverRow;
    if (!r) return null;
    return {
      title: r.n === 0 ? `Today · ${r.year}` : `${r.year} · in ${r.n} ${r.n === 1 ? 'year' : 'years'}`,
      headline: fmt.money(r.portfolio) + (income ? ' a year' : ''),
      sub: `${fmt.money(r.portfolioReal)} in today’s money`,
      rows: [
        { label: pr.altLabel, value: fmt.money(r.safe), color: 'var(--grey-series)' },
        { label: 'Goal', value: fmt.money(r.goal), color: 'var(--t3)' },
        { label: 'Contributed to date', value: fmt.money(r.contributedToDate), color: 'var(--accent-4)' },
        { label: 'Dividends to date', value: fmt.money(r.dividends), color: 'var(--accent-3)' }
      ],
      footer: r.reached ? 'Goal reached' : `${fmt.money(r.goal - r.portfolio)} to go`,
      footerTone: r.reached ? 'pos' : undefined
    };
  });

  const xLabels = $derived(
    Array.from({ length: 6 }, (_, i) => Math.round((pr.span * i) / 5)).map((n) => ({
      left: `${((axis.xs(n) / GEO.W) * 100).toFixed(2)}%`,
      label: String(pr.startYear + n)
    }))
  );

  const tableRows = $derived(
    pr.years.filter(
      (r) =>
        r.n === 0 ||
        r.n === pr.span ||
        r.n % step === 0 ||
        (pr.crossPYear !== null && r.year === pr.crossPYear)
    )
  );

  /* ---- copy ------------------------------------------------------------- */

  const verdict = $derived(
    pr.achievable
      ? `Achievable in ${pr.yearsToGoal} ${pr.yearsToGoal === 1 ? 'year' : 'years'}`
      : `Not achievable by ${pr.byYear}`
  );

  const verdictSub = $derived(
    pr.achievable
      ? `By ${pr.crossPYear}${
          pr.crossPYear! < pr.byYear
            ? ` · ${pr.byYear - pr.crossPYear!} years ahead of your ${pr.byYear} target`
            : ' · exactly on your target year'
        }`
      : `Short by ${fmt.money(pr.shortfall)} at ${pr.byYear}${
          S.requiredContribution
            ? `. Contributing ${fmt.money(S.requiredContribution)} a month would close it.`
            : '.'
        }`
  );

  const reward = $derived(
    income
      ? `${fmt.money(pr.target)} a year in dividends needs about ${fmt.compact(pr.rewardCapital)} of capital at today’s ${fmt.pct(pr.startYield)} gross yield — ${fmt.money(pr.target / 12)} a month to spend, ${fmt.money((pr.target * (1 - cfg.taxDrag)) / 12)} after tax.`
      : `At ${fmt.money(pr.target)} this portfolio would pay ${fmt.money(pr.rewardIncome)} a year at today’s ${fmt.pct(pr.startYield)} gross yield — ${fmt.money(pr.rewardIncome / 12)} a month, ${fmt.money((pr.rewardIncome * (1 - cfg.taxDrag)) / 12)} after tax.`
  );

  const draftSpan = $derived(Math.max(1, Math.round(Number(draft.byYear)) - K.today.year));
  const contribTotal = $derived.by(() => {
    let total = 0;
    let rate = Number(draft.monthlyContribution) || 0;
    const growth = (Number(draft.contributionGrowth) || 0) / 100;
    for (let y = 0; y < draftSpan; y++) {
      total += rate * 12;
      rate *= 1 + growth;
    }
    return total;
  });

  const RING = 42;
  const ring = $derived(
    `${((pr.progressPct / 100) * 2 * Math.PI * RING).toFixed(2)} ${(2 * Math.PI * RING).toFixed(2)}`
  );

  const paramRows = $derived([
    { label: 'Starting value', value: fmt.money(pr.startValue), note: 'today’s market value, from the holdings' },
    { label: 'Starting income', value: fmt.money(pr.startIncome), note: `${fmt.pct(pr.startYield)} gross forward yield` },
    { label: 'Contributions', value: fmt.money(pr.totalContributions), note: `over ${pr.span} years, growing ${fmt.pct(cfg.contributionGrowth * 100, 1)} a year` },
    { label: 'Dividends collected', value: fmt.money(pr.totalDividends), note: `${fmt.money(pr.totalTaxes)} of that lost to tax` },
    { label: `Value at ${pr.byYear}`, value: fmt.compact(pr.endValue), note: `${fmt.compact(pr.endReal)} in today’s money at ${fmt.pct(cfg.inflation * 100, 1)} inflation` },
    { label: `${pr.altLabel} at ${pr.byYear}`, value: fmt.compact(pr.endSafe), note: pr.safeAchievable ? `reaches the goal in ${pr.crossSYear}` : 'does not reach the goal' }
  ]);

  const TABLE_COLS = 'minmax(104px,0.9fr) minmax(140px,1fr) minmax(140px,1fr) minmax(150px,1.1fr) minmax(150px,1.1fr)';
</script>

<svelte:head><title>My goal · Snowline</title></svelte:head>

<TopNav
  active="Portfolio"
  subActive="My goal"
  portfolioName={K.portfolioName}
  holdingsCount={S.totals.holdings}
  accountSub={`${K.baseCurrency} · ${S.totals.holdings} holdings`}
/>

<main
  data-r="main"
  style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:18px"
>
  <div style="display:flex;flex-direction:column;gap:5px">
    <div style="display:flex;align-items:center;gap:9px">
      <h1 style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)">My goal</h1>
      <span style="font-size:13px;color:var(--t3);padding-top:6px">{K.portfolioName}</span>
    </div>
    <span style="font-size:12px;color:var(--t3)">
      Target {fmt.money(pr.target)}{income ? ' a year' : ''} by {pr.byYear} · projected from {K.today.label} ·
      {pr.span}-year horizon
    </span>
  </div>

  <div style="display:grid;grid-template-columns:340px minmax(0,1fr);gap:16px" data-r="pair">
    <!-- config -->
    <div class="card" style="padding:18px;display:flex;flex-direction:column;gap:16px;align-self:start">
      <div style="display:flex;flex-direction:column;gap:7px">
        <span style="font-size:12px;font-weight:500;color:var(--t2)">Goal type</span>
        <div style="display:flex;padding:2px;border:1px solid var(--line);border-radius:7px;gap:2px">
          {#each [{ k: 'value' as const, label: 'Value' }, { k: 'income' as const, label: 'Passive income' }] as m (m.k)}
            <button onclick={() => (draft.mode = m.k)}
              style="flex:1;height:28px;border:none;border-radius:5px;font-size:12px;font-weight:{draft.mode === m.k ? 600 : 500};cursor:pointer;background:{draft.mode === m.k ? 'var(--accent-soft)' : 'transparent'};color:{draft.mode === m.k ? 'var(--accent)' : 'var(--t2)'}">{m.label}</button>
          {/each}
        </div>
        <span style="font-size:11px;color:var(--t3);line-height:1.5">
          {draft.mode === 'income'
            ? 'The target is gross dividend income a year, and the projection tracks the income line.'
            : 'The target is portfolio value, and the projection tracks the value line.'}
        </span>
      </div>

      <div style="display:flex;flex-direction:column;gap:6px">
        <span style="font-size:12px;font-weight:500;color:var(--t2)">{draft.mode === 'income' ? 'Target income a year' : 'Target amount'}</span>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:13px;color:var(--t3)">$</span>
          {#if draft.mode === 'income'}
            <input type="number" bind:value={draft.incomeTarget} min="1"
              style="flex:1;height:32px;padding:0 10px;border:1px solid var(--line);border-radius:6px;background:var(--canvas);color:var(--t1);font-size:13px;outline:none" />
          {:else}
            <input type="number" bind:value={draft.valueTarget} min="1"
              style="flex:1;height:32px;padding:0 10px;border:1px solid var(--line);border-radius:6px;background:var(--canvas);color:var(--t1);font-size:13px;outline:none" />
          {/if}
        </div>
        <span style="font-size:11px;color:var(--t3)">
          {draft.mode === 'income'
            ? `Now ${fmt.money(pr.startIncome)} gross a year, ${fmt.pct(pr.startYield)} on ${fmt.money(pr.startValue)}.`
            : `Now ${fmt.money(pr.startValue)} across ${S.totals.holdings} holdings.`}
        </span>
      </div>

      <div style="display:flex;flex-direction:column;gap:6px">
        <span style="font-size:12px;font-weight:500;color:var(--t2)">By year</span>
        <input type="number" bind:value={draft.byYear} min={K.today.year + 1} max="2100"
          style="height:32px;padding:0 10px;border:1px solid var(--line);border-radius:6px;background:var(--canvas);color:var(--t1);font-size:13px;outline:none" />
        <span style="font-size:11px;color:var(--t3)">in {draftSpan} {draftSpan === 1 ? 'year' : 'years'}</span>
      </div>

      <div style="display:flex;flex-direction:column;gap:6px">
        <span style="font-size:12px;font-weight:500;color:var(--t2)">Monthly contribution</span>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:13px;color:var(--t3)">$</span>
          <input type="number" aria-label="Monthly contribution" bind:value={draft.monthlyContribution} min="0"
            style="flex:1;height:32px;padding:0 10px;border:1px solid var(--line);border-radius:6px;background:var(--canvas);color:var(--t1);font-size:13px;outline:none" />
        </div>
        <span style="font-size:11px;color:var(--t3);line-height:1.5">
          {fmt.compact(contribTotal)} total · {fmt.money((Number(draft.monthlyContribution) || 0) * 12)} per year,
          growing {fmt.num(Number(draft.contributionGrowth) || 0, 1)}% a year over {draftSpan} years.
        </span>
      </div>

      {#each [{ open: openReturns, title: 'Returns and inflation', toggle: () => (openReturns = !openReturns), summary: `Return ${fmt.pct(cfg.expectedReturn * 100)} · safe ${fmt.pct(cfg.safeReturn * 100)} · dividend growth ${fmt.pct(cfg.dividendGrowth * 100, 1)} · inflation ${fmt.pct(cfg.inflation * 100, 1)}`, fields: [{ key: 'expectedReturn' as const, label: 'Expected return', hint: 'Total a year — price appreciation plus dividends.' }, { key: 'safeReturn' as const, label: 'Safe scenario return', hint: 'The second, conservative line on the chart.' }, { key: 'dividendGrowth' as const, label: 'Dividend growth', hint: 'How fast the payout itself rises each year.' }, { key: 'inflation' as const, label: 'Inflation', hint: 'Only used for the “in today’s money” figures.' }] }, { open: openOther, title: 'Other', toggle: () => (openOther = !openOther), summary: `Contribution growth ${fmt.pct(cfg.contributionGrowth * 100, 1)} · tax ${fmt.pct(cfg.taxDrag * 100, 0)} · dividends ${cfg.reinvestDividends ? 'reinvested' : 'taken as cash'}`, fields: [{ key: 'contributionGrowth' as const, label: 'Contribution growth', hint: 'Applied to the monthly amount each January.' }, { key: 'taxDrag' as const, label: 'Tax on dividends', hint: 'Withholding, taken before anything is reinvested.' }] }] as sec (sec.title)}
        <div style="display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line);padding-top:14px">
          <button onclick={sec.toggle}
            style="display:flex;align-items:center;justify-content:space-between;gap:10px;border:none;background:transparent;padding:0;cursor:pointer;text-align:left">
            <span style="font-size:12px;font-weight:500;color:var(--t2)">{sec.title}</span>
            <span style="font-size:11px;color:var(--accent)">{sec.open ? '− Collapse' : '+ Expand'}</span>
          </button>
          {#if sec.open}
            {#each sec.fields as f (f.key)}
              <div style="display:flex;flex-direction:column;gap:4px">
                <span style="font-size:11px;color:var(--t3)">{f.label}</span>
                <div style="display:flex;align-items:center;gap:6px">
                  <input type="number" step="0.05" bind:value={draft[f.key]}
                    style="flex:1;height:30px;padding:0 10px;border:1px solid var(--line);border-radius:6px;background:var(--canvas);color:var(--t1);font-size:13px;outline:none" />
                  <span style="font-size:12px;color:var(--t3)">%</span>
                </div>
                <span style="font-size:11px;color:var(--t3);line-height:1.45">{f.hint}</span>
              </div>
            {/each}
            {#if sec.title === 'Other'}
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:4px">
                <span style="display:flex;flex-direction:column;gap:2px">
                  <span style="font-size:12px;color:var(--t1)">Reinvest dividends</span>
                  <span style="font-size:11px;color:var(--t3)">{draft.reinvestDividends ? 'Net dividends buy more shares.' : 'Dividends leave the portfolio.'}</span>
                </span>
                <button onclick={() => (draft.reinvestDividends = !draft.reinvestDividends)} aria-label="Toggle reinvestment"
                  style="width:38px;height:22px;flex:none;border:1px solid {draft.reinvestDividends ? 'var(--accent)' : 'var(--line)'};border-radius:999px;background:{draft.reinvestDividends ? 'var(--accent)' : 'transparent'};display:flex;align-items:center;justify-content:{draft.reinvestDividends ? 'flex-end' : 'flex-start'};padding:2px;cursor:pointer">
                  <span style="width:16px;height:16px;border-radius:50%;background:{draft.reinvestDividends ? 'var(--on-accent)' : 'var(--t3)'}"></span>
                </button>
              </div>
            {/if}
          {:else}
            <span style="font-size:11px;color:var(--t3);line-height:1.5">{sec.summary}</span>
          {/if}
        </div>
      {/each}

      <div style="display:flex;flex-direction:column;gap:7px;border-top:1px solid var(--line);padding-top:14px">
        <div style="display:flex;gap:8px">
          <button onclick={save} disabled={busy}
            style="flex:1;height:34px;border:none;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;background:{dirty ? 'var(--accent)' : 'var(--hover)'};color:{dirty ? 'var(--on-accent)' : 'var(--t2)'}">
            {busy ? 'Calculating…' : 'Save and calculate'}
          </button>
          <button onclick={reset} disabled={busy}
            style="height:34px;padding:0 12px;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--t2);font-size:12px;cursor:pointer">Reset</button>
        </div>
        <span style="font-size:11px;color:{dirty ? 'var(--amber)' : justSaved ? 'var(--accent)' : 'var(--t3)'}">
          {dirty
            ? 'Unsaved changes'
            : justSaved
              ? 'Saved · the dashboard card now reads these settings'
              : 'Saved · the dashboard card reads the same settings'}
        </span>
      </div>
    </div>

    <!-- results -->
    <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
      <div class="card" style="padding:18px;display:flex;align-items:center;gap:20px;flex-wrap:wrap">
        <div style="position:relative;width:96px;height:96px;flex:none">
          <svg width="96" height="96" viewBox="0 0 96 96" style="display:block">
            <circle cx="48" cy="48" r={RING} fill="none" stroke="var(--line)" stroke-width="8" />
            <circle cx="48" cy="48" r={RING} fill="none" stroke="var(--accent)" stroke-width="8" stroke-dasharray={ring} transform="rotate(-90 48 48)" />
          </svg>
          <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:600;color:var(--t1)">{fmt.num(pr.progressPct, pr.progressPct < 10 ? 1 : 0)}%</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;min-width:0;flex:1">
          <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
            <span style="font-size:26px;font-weight:600;letter-spacing:-0.02em;color:var(--t1)">{fmt.k(pr.current)}</span>
            <span style="font-size:14px;color:var(--t3)">/ {fmt.k(pr.target)}</span>
            <span style="font-size:12px;color:var(--t2)">{pr.modeLabel}</span>
          </div>
          <span style="font-size:12px;color:var(--t3)">
            {income
              ? `${fmt.money(pr.target - pr.current)} a year still to build · ${fmt.money(pr.startValue)} invested today`
              : `${fmt.money(pr.target - pr.current)} to go · ${fmt.money(pr.totalContributions)} of that from contributions`}
          </span>
          <div style="display:flex;flex-direction:column;gap:2px;border-left:2px solid {pr.achievable ? 'var(--accent)' : 'var(--amber)'};padding-left:11px;margin-top:2px">
            <span style="font-size:13px;font-weight:500;color:{pr.achievable ? 'var(--t1)' : 'var(--amber)'}">{verdict}</span>
            <span style="font-size:12px;color:var(--t2);line-height:1.5">{verdictSub}</span>
          </div>
        </div>
      </div>

      <!-- chart -->
      <div class="card">
        <div class="card-head">
          <span class="card-title">{income ? 'Projected income' : 'Projected value'} · {pr.startYear} – {pr.byYear}</span>
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:14px">
            <div style="display:flex;align-items:center;gap:12px">
              {#each [{ label: 'Portfolio', border: '2px solid var(--accent)' }, { label: pr.altLabel, border: '2px dashed var(--grey-series)' }, { label: 'Goal', border: '1px dashed var(--t3)' }] as l (l.label)}
                <span style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t3)">
                  <span style="width:14px;border-top:{l.border}"></span>{l.label}
                </span>
              {/each}
            </div>
            <div style="display:flex;padding:2px;border:1px solid var(--line);border-radius:7px;gap:2px">
              {#each ['Log', 'Linear'] as const as s (s)}
                <button onclick={() => (scale = s)}
                  style="height:24px;padding:0 9px;border:none;border-radius:5px;font-size:11px;font-weight:{scale === s ? 600 : 500};cursor:pointer;background:{scale === s ? 'var(--accent-soft)' : 'transparent'};color:{scale === s ? 'var(--accent)' : 'var(--t2)'}">{s}</button>
              {/each}
            </div>
          </div>
        </div>

        <div style="padding:14px 18px 18px">
          <div style="position:relative">
            <svg viewBox="0 0 {GEO.W} {GEO.H}" style="width:100%;height:auto;display:block" role="presentation"
              onmouseleave={() => (hoverN = null)}>
              {#each axis.ticks as v (v)}
                <line x1={GEO.L} y1={axis.ys(v).toFixed(1)} x2={GEO.W - GEO.R} y2={axis.ys(v).toFixed(1)} stroke="var(--line)" stroke-width="1" stroke-dasharray="3 4" />
                <text x={GEO.L - 8} y={(axis.ys(v) + 3.5).toFixed(1)} text-anchor="end" font-size="10" fill="var(--t3)">{fmt.compact(v)}</text>
              {/each}

              <line x1={GEO.L} y1={axis.ys(pr.target).toFixed(1)} x2={GEO.W - GEO.R} y2={axis.ys(pr.target).toFixed(1)} stroke="var(--t3)" stroke-width="1.2" stroke-dasharray="5 4" />
              <text x={GEO.L + 4} y={(axis.ys(pr.target) - 6).toFixed(1)} font-size="10" font-weight="500" fill="var(--t2)">Goal {fmt.compact(pr.target)}</text>

              <polyline points={safePoints} fill="none" stroke="var(--grey-series)" stroke-width="1.8" stroke-dasharray="4 3" stroke-linejoin="round" />
              <polyline points={portPoints} fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linejoin="round" />

              {#each marks as m (m.label)}
                <rect x={m.x} y={m.y} width="9" height="9" fill="var(--card)" stroke={m.color} stroke-width="2" />
              {/each}

              {#if hoverRow}
                <line x1={axis.xs(hoverRow.n).toFixed(1)} y1={GEO.TOP} x2={axis.xs(hoverRow.n).toFixed(1)} y2={GEO.H - GEO.BOT} stroke="var(--t3)" stroke-width="1" stroke-dasharray="3 3" />
                <circle cx={axis.xs(hoverRow.n).toFixed(1)} cy={axis.ys(hoverRow.portfolio).toFixed(1)} r="4" fill="var(--accent)" />
                <circle cx={axis.xs(hoverRow.n).toFixed(1)} cy={axis.ys(hoverRow.safe).toFixed(1)} r="3.5" fill="var(--grey-series)" />
              {/if}

              <!-- hover slots -->
              {#each pr.years as r (r.n)}
                <rect
                  x={(axis.xs(r.n) - (GEO.W - GEO.L - GEO.R) / pr.span / 2).toFixed(1)}
                  y={GEO.TOP}
                  width={((GEO.W - GEO.L - GEO.R) / pr.span).toFixed(1)}
                  height={GEO.H - GEO.BOT - GEO.TOP}
                  fill="transparent"
                  onmouseenter={() => (hoverN = r.n)}
                  role="presentation"
                />
              {/each}
            </svg>

            {#each marks as m (m.label)}
              <span style="position:absolute;left:{m.left};top:{m.labelTop};transform:translateX(-50%);font-size:10px;font-weight:500;color:{m.color};pointer-events:none">{m.label}</span>
            {/each}

            {#if hoverTip}
              <div style="position:absolute;top:8px;left:{(hoverFrac * 100).toFixed(2)}%;transform:{hoverFrac < 0.3 ? 'translateX(-10%)' : hoverFrac > 0.7 ? 'translateX(-90%)' : 'translateX(-50%)'};z-index:8;pointer-events:none">
                <ChartTooltip tip={hoverTip} />
              </div>
            {/if}
          </div>

          <div style="position:relative;height:14px;margin-top:2px">
            {#each xLabels as x (x.label)}
              <span style="position:absolute;left:{x.left};top:0;transform:translateX(-50%);font-size:10px;color:var(--t3)">{x.label}</span>
            {/each}
          </div>

          <p style="margin:14px 0 0;font-size:12px;color:var(--t2);line-height:1.6">{reward}</p>

          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px">
            {#each [{ label: 'Returns', value: `${fmt.pct(cfg.expectedReturn * 100)} expected · ${fmt.pct(cfg.safeReturn * 100)} safe` }, { label: 'Contributions', value: `${fmt.money(cfg.monthlyContribution)} (▲${fmt.num(cfg.contributionGrowth * 100, 1)}% annually)` }, { label: cfg.reinvestDividends ? 'Reinvest dividends' : 'Dividends as cash', value: '' }, ...(chipsOpen ? [{ label: 'Dividend growth', value: `${fmt.pct(cfg.dividendGrowth * 100, 1)} a year` }, { label: 'Tax on dividends', value: fmt.pct(cfg.taxDrag * 100, 0) }, { label: 'Inflation', value: fmt.pct(cfg.inflation * 100, 1) }, { label: 'Starting yield', value: `${fmt.pct(pr.startYield)} gross` }] : [])] as chip (chip.label)}
              <span style="display:flex;align-items:center;gap:6px;height:26px;padding:0 11px;border:1px solid var(--line);border-radius:999px;font-size:11px;color:var(--t2)">
                <span style="color:var(--t3)">{chip.label}</span>
                {#if chip.value}<span style="color:var(--t1)">{chip.value}</span>{/if}
              </span>
            {/each}
            <button onclick={() => (chipsOpen = !chipsOpen)} style="border:none;background:transparent;color:var(--accent);font-size:11px;font-weight:500;cursor:pointer;padding:0">{chipsOpen ? 'Less' : 'More…'}</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- scenarios -->
  <div class="card">
    <div class="card-head">
      <span class="card-title">Scenarios</span>
      <span class="card-note">the same projection under different assumptions</span>
    </div>
    <div style="padding:4px 20px 16px;max-width:100%;overflow-x:auto;overscroll-behavior-x:contain">
      <div style="min-width:640px">
      <div style="display:grid;grid-template-columns:minmax(0,1.4fr) 140px 180px 180px;gap:12px;padding:10px 0;border-bottom:1px solid var(--line);font-size:12px;font-weight:500;color:var(--t2)">
        <span>Scenario</span><span style="text-align:right">Return</span>
        <span style="text-align:right">Goal reached</span>
        <span style="text-align:right">{pr.modeLabel} at {pr.byYear}</span>
      </div>
      {#each S.scenarios as s (s.name)}
        <div style="display:grid;grid-template-columns:minmax(0,1.4fr) 140px 180px 180px;gap:12px;padding:10px 0;border-bottom:1px solid var(--line);font-size:12px;background:{s.self ? 'var(--accent-soft)' : 'transparent'};font-weight:{s.self ? 600 : 400}">
          <span style="color:var(--t1)">{s.name}</span>
          <span style="text-align:right;color:var(--t2)">{fmt.pct(s.expectedReturn * 100)}</span>
          <span style="text-align:right;color:{s.crossPYear === null ? 'var(--t3)' : 'var(--accent)'}">
            {s.crossPYear === null ? `not by ${s.byYear}` : `${s.crossPYear} · ${s.yearsToGoal}y`}
          </span>
          <span style="text-align:right;color:var(--t1)">{fmt.compact(s.endValue)}</span>
        </div>
      {/each}
      </div>
    </div>
  </div>

  <!-- parameters -->
  <div class="card">
    <button onclick={() => (paramsOpen = !paramsOpen)}
      style="display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:15px 20px;border:none;background:transparent;cursor:pointer;text-align:left">
      <span style="display:flex;align-items:center;gap:10px">
        <span class="card-title">All parameters</span>
        <span class="card-note">what the projection started from and where it ends</span>
      </span>
      <span style="font-size:12px;color:var(--accent);font-weight:500">{paramsOpen ? '− Collapse' : '+ Expand'}</span>
    </button>
    {#if paramsOpen}
      <div style="border-top:1px solid var(--line);padding:4px 20px 16px">
        {#each paramRows as r (r.label)}
          <div style="display:grid;grid-template-columns:minmax(0,1fr) 160px minmax(0,1.3fr);gap:12px;padding:10px 0;border-bottom:1px solid var(--line);font-size:12px">
            <span style="color:var(--t1)">{r.label}</span>
            <span style="text-align:right;color:var(--t1);font-weight:500">{r.value}</span>
            <span style="color:var(--t3)">{r.note}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- year by year -->
  <div class="card">
    <div class="card-head">
      <span class="card-title">Year by year</span>
      <div style="display:flex;padding:2px;border:1px solid var(--line);border-radius:7px;gap:2px">
        {#each [1, 2, 5] as const as s (s)}
          <button onclick={() => (step = s)}
            style="height:24px;padding:0 10px;border:none;border-radius:5px;font-size:11px;font-weight:{step === s ? 600 : 500};cursor:pointer;background:{step === s ? 'var(--accent-soft)' : 'transparent'};color:{step === s ? 'var(--accent)' : 'var(--t2)'}">{s} year{s === 1 ? '' : 's'}</button>
        {/each}
      </div>
    </div>
    <div style="overflow-x:auto">
      <div style="min-width:760px">
        <div style="display:grid;grid-template-columns:{TABLE_COLS};gap:12px;padding:10px 20px;border-bottom:1px solid var(--line);font-size:12px;font-weight:500;color:var(--t2)">
          <span>Year</span>
          <span style="text-align:right">Goal</span>
          <span style="text-align:right">Contributions</span>
          <span style="text-align:right">Portfolio ({pr.modeLabel})</span>
          <span style="text-align:right">{pr.altLabel}</span>
        </div>
        {#each tableRows as r (r.n)}
          <div style="display:grid;grid-template-columns:{TABLE_COLS};gap:12px;padding:9px 20px;border-bottom:1px solid var(--line);font-size:12px;background:{r.reached && !pr.years[r.n - 1]?.reached ? 'var(--accent-soft)' : 'transparent'}">
            <span style="display:flex;flex-direction:column;gap:1px">
              <span style="color:var(--t1)">{r.year}</span>
              <span style="font-size:11px;color:var(--t3)">{r.n === 0 ? 'today' : `in ${r.n} ${r.n === 1 ? 'year' : 'years'}`}</span>
            </span>
            <span style="text-align:right;display:flex;flex-direction:column;gap:1px">
              <span style="color:var(--t2)">{fmt.money(r.goal)}</span>
              <span style="font-size:11px;color:var(--t3)">{r.reached ? 'reached' : `${fmt.money(r.goal - r.portfolio)} to go`}</span>
            </span>
            <span style="text-align:right;color:var(--t2)">{fmt.money(r.contributedToDate)}</span>
            <span style="text-align:right;display:flex;flex-direction:column;gap:1px">
              <span style="color:var(--t1);font-weight:500">{fmt.money(r.portfolio)}</span>
              <span style="font-size:11px;color:var(--t3)">{fmt.money(r.portfolioReal)} today’s money</span>
            </span>
            <span style="text-align:right;color:var(--t2)">{fmt.money(r.safe)}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</main>
