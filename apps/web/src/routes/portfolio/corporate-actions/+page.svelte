<!--
  Portfolio → Corporate actions. Port of the bundle's CorporateActions.dc.html.

  The audit trail that explains why a share count or a basis per share moved.
  Only two of these events change a number; the rest are neutral by
  construction, and the screen says which is which.
-->
<script lang="ts">
  import { MONTHS, fmt } from '@snowline/core';
  import TopNav from '$lib/components/TopNav.svelte';
  import type { CorporateActionLogEntry } from '$lib/api';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const S = $derived(data.screen);
  const K = $derived(S.constants);

  let type = $state<string | null>(null);
  let holding = $state<string | null>(null);
  let query = $state('');
  let menu = $state<string | null>(null);
  let open = $state<string | null>(null);
  let hover = $state<string | null>(null);
  let titleTip = $state(false);

  const MONTH_NAMES: readonly string[] = MONTHS;

  /** How long ago an event was, in whole months from the portfolio's today. */
  function monthsAgo(date: string): string {
    const p = date.split(' ');
    const y = +p[2];
    const m = MONTH_NAMES.indexOf(p[1]);
    const diff = (K.today.year - y) * 12 + (K.today.monthIndex - m);
    if (diff <= 0) return 'this month';
    if (diff === 1) return '1 month ago';
    if (diff < 12) return `${diff} months ago`;
    const years = Math.floor(diff / 12);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  }

  const typeCounts = $derived.by(() => {
    const c: Record<string, number> = {};
    S.log.forEach((e) => (c[e.type] = (c[e.type] ?? 0) + 1));
    return c;
  });

  const holdCounts = $derived.by(() => {
    const c: Record<string, number> = {};
    S.log.forEach((e) => (c[e.ticker] = (c[e.ticker] ?? 0) + 1));
    return c;
  });

  const shown = $derived.by(() => {
    let list = S.log;
    if (type) list = list.filter((e) => e.type === type);
    if (holding) list = list.filter((e) => e.ticker === holding);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((e) =>
        `${e.ticker} ${e.name} ${e.type} ${e.headline} ${e.detail} ${e.date}`.toLowerCase().includes(q)
      );
    }
    return list;
  });

  const restating = $derived(S.log.filter((e) => e.sharesChanged || e.basisChanged));
  const breaks = $derived(
    S.reconciliation.filter((r) => Math.abs(r.sharesDelta) > 0.00002 || Math.abs(r.costDelta) > 0.01)
  );

  const stats = $derived([
    {
      label: 'Events recorded',
      primary: String(S.log.length),
      tone: 'plain' as const,
      secondary: `${S.stats.completed} completed`,
      note: `${S.stats.pending} announced`,
      tip: 'Every corporate action booked against this portfolio, newest first. Announced events are recorded but not applied.'
    },
    {
      label: 'Restatements',
      primary: String(restating.length),
      tone: 'plain' as const,
      secondary: restating.length
        ? [...new Set(restating.map((e) => e.ticker))].join(', ')
        : 'none',
      note: restating.length ? 'shares or basis moved' : '',
      tip: 'Only these events changed a share count or a cost basis. The rest are numerically neutral: a ticker change, a 1-for-1 reorganisation, a cash special dividend and an announced spin-off.'
    },
    {
      label: 'Cost basis reduced',
      primary: fmt.money(S.stats.basisReduced),
      tone: S.stats.basisReduced ? ('neg' as const) : ('plain' as const),
      secondary: S.stats.basisReduced ? 'across 2 returns of capital' : 'no returns of capital',
      note: S.stats.basisReduced ? 'untaxed this year' : '',
      tip: 'A return of capital is not taxed as income. It comes off the cost basis instead, which raises the eventual capital gain by the same amount.'
    },
    {
      label: 'Reconciliation',
      primary: breaks.length ? `${breaks.length} breaks` : 'Clean',
      tone: breaks.length ? ('neg' as const) : ('pos' as const),
      secondary: `${S.reconciliation.length} instruments checked`,
      note: 'shares, basis, income',
      tip: 'Every buy lot is re-adjusted through its ticker’s split chain and each return of capital is subtracted before comparing against the stored position. Zero breaks means no corporate action has silently moved a number.'
    }
  ]);

  let statTip = $state<string | null>(null);

  const toneColor = (t: 'plain' | 'pos' | 'neg') =>
    t === 'pos' ? 'var(--accent)' : t === 'neg' ? 'var(--neg)' : 'var(--t1)';

  /** The one-line effect summary shown in the row. */
  function effect(e: CorporateActionLogEntry) {
    if (e.pending) {
      return { shares: 'Nothing applied yet', basis: 'awaiting the distribution ratio', tone: 'plain' as const };
    }
    return {
      shares: e.sharesChanged
        ? `${fmt.shares(e.sharesBefore)} → ${fmt.shares(e.sharesAfter)} sh`
        : `${fmt.shares(e.sharesAfter)} sh unchanged`,
      basis: e.basisChanged
        ? `${fmt.money(e.basisBefore)} → ${fmt.money(e.basisAfter)}`
        : `${fmt.money(e.basisAfter)} basis unchanged`,
      tone: e.basisChanged ? ('neg' as const) : ('plain' as const)
    };
  }

  /** The expanded fact list. */
  function facts(e: CorporateActionLogEntry) {
    if (e.pending) {
      return [
        { k: 'Distribution ratio', v: 'not published', color: 'var(--amber)' },
        { k: 'Shares held today', v: `${fmt.shares(e.sharesAfter)} shares`, color: 'var(--t1)' },
        { k: 'Cost basis today', v: fmt.money(e.basisAfter), color: 'var(--t1)' },
        { k: 'Applied to the position', v: 'not until the distribution date', color: 'var(--t2)' }
      ];
    }
    return [
      {
        k: 'Shares',
        v: e.sharesChanged ? `${fmt.shares(e.sharesBefore)} → ${fmt.shares(e.sharesAfter)}` : 'unchanged',
        color: e.sharesChanged ? 'var(--t1)' : 'var(--t2)'
      },
      {
        k: 'Cost basis',
        v: e.basisChanged
          ? `${fmt.money(e.basisBefore)} → ${fmt.money(e.basisAfter)}`
          : `${fmt.money(e.basisAfter)}, unchanged`,
        color: e.basisChanged ? 'var(--t1)' : 'var(--t2)'
      },
      {
        k: 'Basis per share',
        v: `${fmt.money(e.perShareBefore)} → ${fmt.money(e.perShareAfter)}`,
        color: Math.abs(e.perShareBefore - e.perShareAfter) > 0.005 ? 'var(--t1)' : 'var(--t2)'
      },
      {
        k: 'Cash to the account',
        v: e.cash ? fmt.money(e.cash) : 'none',
        color: e.cash ? 'var(--accent)' : 'var(--t2)'
      }
    ];
  }

  const typeSub = (e: CorporateActionLogEntry) =>
    e.ratioLabel
      ? e.ratioLabel
      : e.basisAdjust
        ? `${fmt.money(e.basisAdjust)} booked`
        : e.cash
          ? `${fmt.money(e.cash)} cash`
          : 'no restatement';

  const statusChip = (s: string) =>
    s === 'Completed'
      ? { bg: 'var(--accent-soft)', fg: 'var(--accent)' }
      : { bg: 'var(--tag-bg)', fg: 'var(--tag-fg)' };

  const GRID = '128px 150px 190px minmax(0,1fr) 240px 108px 44px';

  const searchItems = $derived(
    [...new Set(S.log.map((e) => e.ticker))].map((tk) => {
      const e = S.log.find((x) => x.ticker === tk)!;
      return { ticker: tk, name: e.name, mono: e.mono, sector: e.assetClass, value: '', href: `/portfolio/holdings#${tk}` };
    })
  );
</script>

<svelte:head><title>Corporate actions · Snowline</title></svelte:head>
<svelte:window onclick={() => (menu = null)} />

<TopNav
  active="Portfolio"
  subActive="Corporate actions"
  portfolioName={K.portfolioName}
  holdingsCount={S.totals.holdings}
  {searchItems}
  accountSub={`${K.baseCurrency} · ${S.totals.holdings} holdings`}
/>

<main
  data-r="main"
  style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:18px"
>
  <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
    <div style="display:flex;align-items:center;gap:9px;position:relative">
      <h1 style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)">
        Corporate actions
      </h1>
      <span
        role="note"
        onmouseenter={() => (titleTip = true)}
        onmouseleave={() => (titleTip = false)}
        style="width:15px;height:15px;margin-top:6px;flex:none;border:1px solid var(--line);border-radius:50%;font-size:10px;color:var(--t3);display:flex;align-items:center;justify-content:center;cursor:help"
        >?</span
      >
      <span style="font-size:13px;color:var(--t3);padding-top:6px">{K.portfolioName}</span>
      {#if titleTip}
        <span
          style="position:absolute;top:44px;left:0;z-index:30;width:340px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:11px 13px;font-size:11px;line-height:1.55;color:var(--t2);pointer-events:none"
        >
          Everything that changed a position without being a trade: splits, reverse splits, mergers,
          spin-offs, ticker changes, special dividends and returns of capital. Events that restate
          shares or cost basis are already reflected in the holdings table — this screen is the audit
          trail that explains why a share count or a basis per share moved.
        </span>
      {/if}
    </div>
    <span style="font-size:12px;color:var(--t3)">
      {S.log.length} events · {Object.keys(typeCounts).length} types · {Object.keys(holdCounts).length}
      holdings affected · {restating.length} restated a position · reconciliation passes on all {S.reconciliation.length}
      instruments
    </span>
  </div>

  <!-- stats -->
  <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden">
    {#each stats as s (s.label)}
      <div style="position:relative;display:flex;flex-direction:column;gap:4px;padding:15px 18px;border-right:1px solid var(--line)">
        <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t3)">
          {s.label}
          <span
            role="note"
            onmouseenter={() => (statTip = s.label)}
            onmouseleave={() => (statTip = null)}
            style="width:12px;height:12px;flex:none;border:1px solid var(--line);border-radius:50%;font-size:8px;color:var(--t3);display:flex;align-items:center;justify-content:center;cursor:help"
            >?</span
          >
        </span>
        <span style="font-size:19px;font-weight:600;letter-spacing:-0.02em;color:{toneColor(s.tone)}">{s.primary}</span>
        <span style="font-size:11px;color:var(--t3)">{s.secondary}</span>
        {#if s.note}
          <span style="font-size:11px;color:var(--t3)">{s.note}</span>
        {/if}
        {#if statTip === s.label}
          <span style="position:absolute;top:52px;left:14px;z-index:30;width:250px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:10px 12px;font-size:11px;line-height:1.5;color:var(--t2);pointer-events:none">{s.tip}</span>
        {/if}
      </div>
    {/each}
  </div>

  <!-- filters -->
  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    {#each [{ key: 'type', label: type ?? 'All types', active: !!type, width: 232, options: [{ label: 'All types', value: null, meta: `${S.log.length} events` }, ...Object.keys(typeCounts).sort().map((t) => ({ label: t, value: t, meta: `${typeCounts[t]} ${typeCounts[t] === 1 ? 'event' : 'events'}` }))] }, { key: 'hold', label: holding ?? 'All holdings', active: !!holding, width: 268, options: [{ label: 'All holdings', value: null, meta: `${Object.keys(holdCounts).length} affected` }, ...Object.keys(holdCounts).sort().map((t) => ({ label: t, value: t, meta: `${holdCounts[t]} ${holdCounts[t] === 1 ? 'event' : 'events'}` }))] }] as ctl (ctl.key)}
      <div style="position:relative">
        <button
          onclick={(e) => { e.stopPropagation(); menu = menu === ctl.key ? null : ctl.key; }}
          style="display:flex;align-items:center;gap:8px;height:32px;padding:0 12px;border:1px solid {ctl.active ? 'var(--accent)' : 'var(--line)'};border-radius:6px;background:{ctl.active ? 'var(--accent-soft)' : 'transparent'};color:{ctl.active ? 'var(--accent)' : 'var(--t1)'};font-size:12px;cursor:pointer"
        >
          {ctl.label}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {#if menu === ctl.key}
          <div role="menu" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}
            style="position:absolute;top:38px;left:0;z-index:40;width:{ctl.width}px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px;max-height:340px;overflow-y:auto">
            {#each ctl.options as o (o.label)}
              {@const on = (o.value ?? null) === (ctl.key === 'type' ? type : holding)}
              <button
                onclick={() => { if (ctl.key === 'type') type = o.value; else holding = o.value; menu = null; open = null; }}
                style="display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;height:40px;padding:0 10px;border:none;border-radius:6px;background:{on ? 'var(--accent-soft)' : 'transparent'};color:{on ? 'var(--accent)' : 'var(--t1)'};font-weight:{on ? 600 : 400};font-size:13px;cursor:pointer;text-align:left"
              >
                <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{o.label}</span>
                <span style="font-size:11px;color:var(--t3);white-space:nowrap">{o.meta}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}

    <div style="position:relative">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="1.8" stroke-linecap="round" style="position:absolute;left:9px;top:9px"><circle cx="11" cy="11" r="7" /><path d="M16.6 16.6L21 21" /></svg>
      <input bind:value={query} onclick={(e) => e.stopPropagation()} placeholder="Search events"
        style="height:32px;width:216px;padding:0 10px 0 29px;border:1px solid var(--line);border-radius:6px;background:var(--canvas);color:var(--t1);font-size:12px;outline:none" />
    </div>

    {#if type || holding || query.trim()}
      <button onclick={() => { type = null; holding = null; query = ''; menu = null; }}
        style="border:none;background:transparent;color:var(--t2);font-size:12px;cursor:pointer;padding:0">Clear</button>
    {/if}

    <div style="flex:1"></div>
    <span style="font-size:12px;color:var(--t3)">
      {shown.length === S.log.length ? `${S.log.length} events` : `${shown.length} of ${S.log.length} events`}
    </span>
  </div>

  <!-- log -->
  <div class="card" style="overflow-x:auto">
    <div style="min-width:1000px">
      <div style="display:grid;grid-template-columns:{GRID};gap:0;border-bottom:1px solid var(--line);padding:0 16px">
        {#each ['Date', 'Type', 'Holding', 'Description', 'Effect on the position', 'Status', ''] as h, i (h + i)}
          <div style="display:flex;align-items:center;justify-content:{h === 'Effect on the position' ? 'flex-end' : 'flex-start'};padding:11px 10px;font-size:12px;font-weight:500;color:var(--t2)">{h}</div>
        {/each}
      </div>

      {#each shown as e (e.id)}
        {@const isOpen = open === e.id}
        {@const chip = statusChip(e.status)}
        {@const eff = effect(e)}
        {@const moves = e.sharesChanged || e.basisChanged}
        <div style="border-bottom:1px solid var(--line);background:{isOpen ? 'var(--accent-soft)' : hover === e.id ? 'var(--hover)' : 'var(--card)'}">
          <div
            role="row" tabindex="-1"
            onclick={() => (open = isOpen ? null : e.id)}
            onkeydown={(ev) => { if (ev.key === 'Enter') open = isOpen ? null : e.id; }}
            onmouseenter={() => (hover = e.id)}
            onmouseleave={() => (hover = null)}
            style="display:grid;grid-template-columns:{GRID};gap:0;padding:0 16px;cursor:pointer"
          >
            <div style="display:flex;flex-direction:column;justify-content:center;gap:2px;padding:13px 10px">
              <span style="font-size:13px;color:var(--t1);white-space:nowrap">{e.date}</span>
              <span style="font-size:11px;color:var(--t3)">{monthsAgo(e.date)}</span>
            </div>

            <div style="display:flex;flex-direction:column;justify-content:center;gap:2px;padding:13px 10px">
              <span style="font-size:13px;font-weight:500;color:var(--t1)">{e.type}</span>
              <span style="font-size:11px;color:var(--t3)">{typeSub(e)}</span>
            </div>

            <div style="display:flex;align-items:center;gap:9px;padding:11px 10px;min-width:0">
              <span class="mono-badge" style="width:26px;height:26px">{e.mono}</span>
              <span style="display:flex;flex-direction:column;gap:1px;min-width:0">
                <span style="font-size:13px;font-weight:500;color:var(--t1)">{e.displayTicker}</span>
                <span style="font-size:11px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{e.name}</span>
              </span>
            </div>

            <div style="display:flex;align-items:center;padding:13px 10px;min-width:0">
              <span style="font-size:12px;color:var(--t2);line-height:1.45;{isOpen ? '' : 'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden'}">{e.headline}</span>
            </div>

            <div style="display:flex;flex-direction:column;justify-content:center;align-items:flex-end;gap:2px;padding:11px 10px;border-left:{moves ? '2px solid var(--amber)' : '1px solid var(--line)'};margin:8px 0">
              <span style="font-size:12px;color:{toneColor(eff.tone)};white-space:nowrap">{eff.shares}</span>
              <span style="font-size:11px;color:var(--t3);white-space:nowrap">{eff.basis}</span>
            </div>

            <div style="display:flex;align-items:center;padding:13px 10px">
              <span style="font-size:11px;font-weight:500;padding:3px 9px;border-radius:999px;background:{chip.bg};color:{chip.fg};white-space:nowrap">{e.status}</span>
            </div>

            <div style="display:flex;align-items:center;justify-content:center;padding:13px 4px">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2.2" stroke-linecap="round" style="transform:rotate({isOpen ? 180 : 0}deg);transition:transform .15s ease"><path d="M6 9l6 6 6-6" /></svg>
            </div>
          </div>

          {#if isOpen}
            <div style="padding:2px 26px 18px;display:flex;flex-direction:column;gap:14px">
              <p style="margin:0;font-size:12px;color:var(--t2);line-height:1.6;max-width:76ch">{e.detail}</p>
              <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px">
                {#each facts(e) as f (f.k)}
                  <div style="display:flex;flex-direction:column;gap:3px;border-left:2px solid var(--line);padding-left:11px">
                    <span style="font-size:11px;color:var(--t3)">{f.k}</span>
                    <span style="font-size:13px;color:{f.color}">{f.v}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}

      {#if !shown.length}
        <div style="padding:28px 20px;font-size:12px;color:var(--t3)">
          {query.trim()
            ? `Nothing matches “${query.trim()}” in ${S.log.length} recorded events.`
            : `No ${type ? type.toLowerCase() : 'event'}${holding ? ` on ${holding}` : ''} has been recorded.`}
        </div>
      {/if}
    </div>
  </div>

  <p style="margin:0;font-size:11px;color:var(--t3)">
    Recording a new corporate action is not built in this POC — in the prototype it logs an event
    without applying it to the position.
  </p>
</main>
