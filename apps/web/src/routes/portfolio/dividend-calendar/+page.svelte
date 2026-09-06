<!--
  Portfolio → Dividend calendar. Port of the bundle's DividendCalendar.dc.html.

  Every payment is projected from the holding's own declared ex-date and
  pay-date, stepped forward at its frequency, using the same annualGross() the
  rest of the app uses — so a month here agrees with the forward schedule on
  the Dashboard.

  Filtering is client-side over the raw events, which is why the totals are
  recomputed here rather than taken from the payload.
-->
<script lang="ts">
  import { fmt, type CalendarEvent, type CalendarMonth } from '@snowline/core';
  import TopNav from '$lib/components/TopNav.svelte';
  import type { DividendCalendarPayload } from '$lib/api';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  /**
   * Navigation refetches client-side, so the rendered payload is whatever the
   * last fetch returned — falling back to the server's until one happens, and
   * back again if the server load reruns.
   */
  let fetched = $state<DividendCalendarPayload | null>(null);
  const payload = $derived(fetched ?? data.screen);
  const K = $derived(payload.constants);
  const T = $derived(payload.totals);

  let offset = $state(0);
  let windowOffset = $state(0);
  let status = $state<'All' | 'Paid' | 'Declared' | 'Estimated'>('All');
  let payout = $state<'All' | 'Monthly' | 'Quarterly'>('All');
  let query = $state('');
  let view = $state<'Calendar' | 'List'>('Calendar');
  let menu = $state<string | null>(null);
  let searchOpen = $state(false);
  let hover = $state<number | null>(null);
  let titleTip = $state(false);
  let loading = $state(false);

  const STATUS = {
    Paid: { color: 'var(--accent)', bg: 'var(--accent-soft)', fg: 'var(--accent)' },
    Declared: { color: 'var(--accent-3)', bg: 'var(--hover)', fg: 'var(--t1)' },
    Estimated: { color: 'var(--grey-series)', bg: 'var(--hover)', fg: 'var(--t2)' }
  } as const;

  /** Navigation refetches — the window can move arbitrarily far from today. */
  async function refetch(nextOffset: number, nextWindow: number) {
    loading = true;
    try {
      const res = await fetch(
        `/api/screens/dividend-calendar?offset=${nextOffset}&windowOffset=${nextWindow}`
      );
      if (res.ok) fetched = await res.json();
    } finally {
      loading = false;
    }
  }

  function move(dOffset: number, dWindow = 0) {
    offset += dOffset;
    windowOffset += dWindow;
    refetch(offset, windowOffset);
  }

  function jumpToMonth(m: CalendarMonth) {
    offset = m.year * 12 + m.monthIndex - (K.today.year * 12 + K.today.monthIndex);
    refetch(offset, windowOffset);
  }

  /** Re-derive a month's totals from the events that survive the filters. */
  function applyFilters(m: CalendarMonth): CalendarMonth {
    const q = query.trim().toLowerCase();
    const keep = m.events.filter(
      (e) =>
        (status === 'All' || e.status === status) &&
        (payout === 'All' || e.frequency === payout) &&
        (!q || `${e.ticker} ${e.name}`.toLowerCase().includes(q))
    );
    const by = (s: string) => keep.filter((e) => e.status === s).reduce((a, e) => a + e.gross, 0);
    return {
      ...m,
      events: keep,
      days: m.days.map((d) => {
        const on = keep.filter((e) => e.day === d.day);
        return {
          ...d,
          events: on,
          gross: on.reduce((a, e) => a + e.gross, 0),
          net: on.reduce((a, e) => a + e.net, 0)
        };
      }),
      gross: keep.reduce((a, e) => a + e.gross, 0),
      netTotal: keep.reduce((a, e) => a + e.net, 0),
      paid: by('Paid'),
      declared: by('Declared'),
      estimated: by('Estimated'),
      count: keep.length
    };
  }

  const month = $derived(applyFilters(payload.month));
  const year = $derived(payload.year.map(applyFilters));
  const yearGross = $derived(year.reduce((a, m) => a + m.gross, 0));
  const yearCount = $derived(year.reduce((a, m) => a + m.count, 0));
  const chartMax = $derived(Math.max(...year.map((m) => m.gross), 1));

  /** Calendar grid, Monday first, padded to whole weeks. */
  const cells = $derived.by(() => {
    const out: Array<{ inMonth: boolean; day?: number; gross?: number; isToday?: boolean; events: CalendarEvent[] }> = [];
    for (let i = 0; i < month.leadingBlanks; i++) out.push({ inMonth: false, events: [] });
    month.days.forEach((d) =>
      out.push({ inMonth: true, day: d.day, gross: d.gross, isToday: d.isToday, events: d.events })
    );
    while (out.length % 7 !== 0) out.push({ inMonth: false, events: [] });
    return out;
  });

  const filtersActive = $derived(status !== 'All' || payout !== 'All' || !!query.trim());

  const searchItems = $derived(
    [...new Map(payload.year.flatMap((m) => m.events).map((e) => [e.ticker, e])).values()].map((e) => ({
      ticker: e.ticker,
      name: e.name,
      mono: e.mono,
      sector: e.frequency,
      value: fmt.money(e.gross),
      href: `/portfolio/holdings#${e.ticker}`
    }))
  );

  const showPerShare = true;
  const listCols = $derived(
    `minmax(190px,1.4fr) 128px 128px 116px ${showPerShare ? '112px ' : ''}116px 124px 132px`
  );
</script>

<svelte:head><title>Dividend calendar · Snowline</title></svelte:head>
<svelte:window onclick={() => (menu = null)} />

<TopNav
  active="Portfolio"
  subActive="Dividend calendar"
  portfolioName={K.portfolioName}
  holdingsCount={T.holdings}
  {searchItems}
  accountSub={`${K.baseCurrency} · ${T.holdings} holdings`}
/>

<main
  data-r="main"
  style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:18px"
>
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
    <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
      <div style="display:flex;align-items:center;gap:9px;position:relative">
        <h1 style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)">
          Dividend calendar
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
          <span style="position:absolute;top:44px;left:0;z-index:30;width:340px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:11px 13px;font-size:11px;line-height:1.55;color:var(--t2);pointer-events:none">
            Every payment is projected from the holding’s own declared ex-date and pay-date, stepped
            forward at its payment frequency. Amounts are gross; the net figures apply
            {fmt.num(K.withholdingTax * 100, 0)}% withholding.
          </span>
        {/if}
      </div>
      <span style="font-size:12px;color:var(--t3)"
        >{yearCount} payments across the next 12 months · {fmt.money(yearGross)} gross</span
      >
    </div>

    <div style="display:flex;align-items:center;gap:8px;flex:none">
      {#each [{ key: 'status', label: 'Status', value: status, options: ['All', 'Paid', 'Declared', 'Estimated'] }, { key: 'payout', label: 'Payout type', value: payout, options: ['All', 'Monthly', 'Quarterly'] }] as ctl (ctl.key)}
        <div style="position:relative">
          <button
            onclick={(e) => { e.stopPropagation(); menu = menu === ctl.key ? null : ctl.key; }}
            style="display:flex;align-items:center;gap:8px;height:32px;padding:0 12px;border:1px solid {ctl.value === 'All' ? 'var(--line)' : 'var(--accent)'};border-radius:6px;background:{ctl.value === 'All' ? 'var(--card)' : 'var(--accent-soft)'};color:{ctl.value === 'All' ? 'var(--t1)' : 'var(--accent)'};font-size:12px;cursor:pointer"
          >
            {ctl.label}: {ctl.value}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {#if menu === ctl.key}
            <div role="menu" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}
              style="position:absolute;top:38px;right:0;z-index:40;width:190px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px">
              {#each ctl.options as o (o)}
                {@const on = ctl.value === o}
                <button
                  onclick={() => { if (ctl.key === 'status') status = o as typeof status; else payout = o as typeof payout; menu = null; }}
                  style="display:flex;align-items:center;gap:9px;width:100%;height:38px;padding:0 10px;border:none;border-radius:6px;background:{on ? 'var(--accent-soft)' : 'transparent'};color:{on ? 'var(--accent)' : 'var(--t1)'};font-weight:{on ? 600 : 400};font-size:13px;cursor:pointer;text-align:left"
                >
                  {#if ctl.key === 'status'}
                    <span style="width:8px;height:8px;border-radius:2px;background:{o === 'All' ? 'var(--line)' : STATUS[o as keyof typeof STATUS].color}"></span>
                  {/if}
                  {o}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/each}

      <div style="position:relative">
        {#if searchOpen}
          <!-- svelte-ignore a11y_autofocus -->
          <input bind:value={query} onclick={(e) => e.stopPropagation()} autofocus placeholder="Search holdings"
            style="height:32px;width:180px;padding:0 11px;border:1px solid var(--accent);border-radius:6px;background:var(--canvas);color:var(--t1);font-size:12px;outline:none" />
        {:else}
          <button onclick={(e) => { e.stopPropagation(); searchOpen = true; }} title="Search" class="icon-btn" style="width:32px;height:32px">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M16.6 16.6L21 21" /></svg>
          </button>
        {/if}
      </div>

      {#if filtersActive}
        <button onclick={() => { status = 'All'; payout = 'All'; query = ''; searchOpen = false; }}
          style="border:none;background:transparent;color:var(--t2);font-size:12px;cursor:pointer;padding:0">Clear</button>
      {/if}
    </div>
  </div>

  <!-- income summary + year chart -->
  <div style="display:grid;grid-template-columns:300px minmax(0,1fr);gap:16px" data-r="pair">
    <div class="card" style="padding:16px 18px;display:flex;flex-direction:column;gap:12px">
      <span style="font-size:12px;color:var(--t3)">Annual income, forward</span>
      <div style="display:flex;flex-direction:column;gap:2px">
        <span style="font-size:24px;font-weight:600;letter-spacing:-0.02em;color:var(--t1)">{fmt.money(T.forwardGross)}</span>
        <span style="font-size:12px;color:var(--t3)">{fmt.money(T.forwardNet)} net of tax</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:0">
        {#each [{ label: 'Monthly average', value: fmt.money(T.forwardGross / 12) }, { label: 'Daily average', value: fmt.money(T.forwardGross / 365) }, { label: 'Gross yield', value: fmt.pct(T.grossYield) }] as r (r.label)}
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);font-size:12px">
            <span style="color:var(--t2)">{r.label}</span>
            <span style="color:var(--t1);font-weight:500">{r.value}</span>
          </div>
        {/each}
      </div>
      <span style="font-size:11px;color:var(--t3);line-height:1.5">
        {payload.paymentCount} payments a year across {payload.payerCount} income-paying holdings. Net yield
        {fmt.pct(T.netYield)} after {fmt.num(K.withholdingTax * 100, 0)}% withholding.
      </span>
    </div>

    <div class="card" style="display:flex;flex-direction:column">
      <div class="card-head">
        <span class="card-title">Gross income · {year[0]?.short} – {year[11]?.short}</span>
        <div style="display:flex;align-items:center;gap:14px">
          <div style="display:flex;align-items:center;gap:12px">
            {#each ['Paid', 'Declared', 'Estimated'] as const as s (s)}
              <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t3)">
                <span style="width:8px;height:8px;border-radius:2px;background:{STATUS[s].color}"></span>{s}
              </span>
            {/each}
          </div>
          <div style="display:flex;gap:2px">
            <button onclick={() => move(0, -1)} aria-label="Previous year" class="icon-btn" style="width:26px;height:26px">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button onclick={() => move(0, 1)} aria-label="Next year" class="icon-btn" style="width:26px;height:26px">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div style="max-width:100%;overflow-x:auto;overscroll-behavior-x:contain">
      <div style="padding:16px 18px 12px;display:flex;align-items:flex-end;gap:4px;height:186px;min-width:560px">
        {#each year as m, i (m.label)}
          {@const isCur = m.year === payload.month.year && m.monthIndex === payload.month.monthIndex}
          <button
            onclick={() => jumpToMonth(m)}
            onmouseenter={() => (hover = i)}
            onmouseleave={() => (hover = null)}
            style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;height:100%;border:none;border-radius:6px;background:{isCur ? 'var(--accent-soft)' : hover === i ? 'var(--hover)' : 'transparent'};cursor:pointer;padding:4px 2px"
          >
            <span style="font-size:10px;color:{isCur ? 'var(--accent)' : 'var(--t3)'}">{m.gross > 0 ? fmt.num(m.gross, 0) : ''}</span>
            <span style="width:70%;display:flex;flex-direction:column;height:{Math.max(2, (m.gross / chartMax) * 118).toFixed(1)}px;border-radius:2px;overflow:hidden">
              {#each [{ k: 'estimated', v: m.estimated, c: STATUS.Estimated.color }, { k: 'declared', v: m.declared, c: STATUS.Declared.color }, { k: 'paid', v: m.paid, c: STATUS.Paid.color }].filter((s) => s.v > 0) as seg (seg.k)}
                <span style="height:{((seg.v / (m.gross || 1)) * 100).toFixed(2)}%;background:{seg.c}"></span>
              {/each}
            </span>
            <span style="font-size:10px;color:{isCur ? 'var(--accent)' : 'var(--t2)'};white-space:nowrap">{m.short}</span>
          </button>
        {/each}
      </div>
      </div>
      <span style="padding:0 18px 14px;font-size:11px;color:var(--t3)">Click a month to open it below.</span>
    </div>
  </div>

  <!-- the month -->
  <div class="card">
    <div class="card-head">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="display:flex;gap:2px">
          <button onclick={() => move(-1)} aria-label="Previous month" class="icon-btn" style="width:28px;height:28px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button onclick={() => move(1)} aria-label="Next month" class="icon-btn" style="width:28px;height:28px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
        <span class="card-title">{month.label}</span>
        <span class="card-note">{fmt.money(month.gross)} gross · {month.count} payments · {fmt.money(month.netTotal)} net</span>
        {#if loading}<span style="font-size:11px;color:var(--t3)">loading…</span>{/if}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        {#if offset !== 0}
          <button onclick={() => { offset = 0; windowOffset = 0; refetch(0, 0); }}
            style="border:none;background:transparent;color:var(--accent);font-size:12px;font-weight:500;cursor:pointer;padding:0">Today</button>
        {/if}
        <div style="display:flex;padding:2px;border:1px solid var(--line);border-radius:7px;gap:2px">
          {#each ['Calendar', 'List'] as const as v (v)}
            <button onclick={() => (view = v)}
              style="height:26px;padding:0 11px;border:none;border-radius:5px;font-size:12px;font-weight:{view === v ? 600 : 500};cursor:pointer;background:{view === v ? 'var(--accent-soft)' : 'transparent'};color:{view === v ? 'var(--accent)' : 'var(--t2)'}">{v}</button>
          {/each}
        </div>
      </div>
    </div>

    {#if month.count === 0}
      <div style="padding:34px 20px;text-align:center;font-size:12px;color:var(--t3)">
        {filtersActive
          ? 'No payment matches the current filters.'
          : 'None of the holdings distribute in this month.'}
      </div>
    {:else if view === 'Calendar'}
      <div style="padding:16px 18px 18px">
        <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-bottom:6px">
          {#each ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as w (w)}
            <span style="font-size:11px;font-weight:500;color:var(--t3);padding:0 4px">{w}</span>
          {/each}
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">
          {#each cells as c, i (i)}
            <div style="min-height:96px;border:1px solid var(--line);border-radius:6px;padding:6px;display:flex;flex-direction:column;gap:5px;background:{c.inMonth ? (c.isToday ? 'var(--accent-soft)' : 'var(--card)') : 'transparent'};opacity:{c.inMonth ? 1 : 0.4}">
              {#if c.inMonth}
                <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
                  <span style="min-width:20px;height:20px;padding:0 5px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:{c.isToday ? 600 : 500};background:{c.isToday ? 'var(--accent)' : 'transparent'};color:{c.isToday ? 'var(--on-accent)' : 'var(--t2)'}">{c.day}</span>
                  {#if c.gross}
                    <span style="font-size:11px;font-weight:500;color:var(--t1)">{fmt.money(c.gross)}</span>
                  {/if}
                </div>
                {#each c.events as e (e.ticker)}
                  <a href="/portfolio/holdings#{e.ticker}"
                    style="display:flex;align-items:center;gap:5px;text-decoration:none;padding:2px 3px;border-radius:4px">
                    <span style="width:6px;height:6px;flex:none;border-radius:2px;background:{STATUS[e.status].color}"></span>
                    <span style="font-size:11px;font-weight:500;color:var(--t1)">{e.ticker}</span>
                    <span style="flex:1"></span>
                    <span style="font-size:11px;color:var(--t3);white-space:nowrap">{fmt.money(e.gross)}</span>
                  </a>
                {/each}
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div style="overflow-x:auto">
        <div style="min-width:1000px">
          <div style="display:grid;grid-template-columns:{listCols};border-bottom:1px solid var(--line);padding:0 18px">
            {#each [{ l: 'Ticker', j: 'flex-start' }, { l: 'Ex-date', j: 'flex-start' }, { l: 'Pay date', j: 'flex-start' }, { l: 'Shares', j: 'flex-end' }, { l: 'Per share', j: 'flex-end' }, { l: 'Gross', j: 'flex-end' }, { l: 'Net', j: 'flex-end' }, { l: 'Status', j: 'flex-start' }] as h (h.l)}
              <div style="display:flex;align-items:center;justify-content:{h.j};padding:11px 10px;font-size:12px;font-weight:500;color:var(--t2)">{h.l}</div>
            {/each}
          </div>
          {#each month.events as e (e.ticker + e.payDate)}
            <div style="display:grid;grid-template-columns:{listCols};border-bottom:1px solid var(--line);padding:0 18px">
              <div style="display:flex;align-items:center;gap:9px;padding:10px;min-width:0">
                <span class="mono-badge" style="width:26px;height:26px">{e.mono}</span>
                <span style="display:flex;flex-direction:column;gap:1px;min-width:0">
                  <span style="font-size:13px;font-weight:500;color:var(--t1)">{e.ticker}</span>
                  <span style="font-size:11px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{e.name}</span>
                </span>
              </div>
              <div style="display:flex;align-items:center;padding:10px;font-size:12px;color:var(--t2)">{e.exDate}</div>
              <div style="display:flex;align-items:center;padding:10px;font-size:12px;color:var(--t1)">{e.payDate}</div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:10px;font-size:12px;color:var(--t1)">{fmt.shares(e.shares)}</div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:10px;font-size:12px;color:var(--t1)">${fmt.num(e.perShare, 4)}</div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:10px;font-size:12px;color:var(--t1)">{fmt.money(e.gross)}</div>
              <div style="display:flex;align-items:center;justify-content:flex-end;padding:10px;font-size:12px;color:var(--accent)">{fmt.money(e.net)}</div>
              <div style="display:flex;align-items:center;padding:10px">
                <span style="font-size:11px;font-weight:500;padding:3px 9px;border-radius:999px;background:{STATUS[e.status].bg};color:{STATUS[e.status].fg}">{e.status}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</main>
