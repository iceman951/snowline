<!--
  HoldingsTable — port of the bundle's HoldingsTable.dc.html.

  Four named views over one column registry, a pinned Holding column with the
  rest scrolling sideways, search, sort, show/hide columns, pagination,
  selection, and a row drawer. Reused by both /portfolio/holdings and
  /analytics, so it takes its title and default view as props.
-->
<script lang="ts">
  import { fmt, type Constants, type Holding, type Totals } from '@snowline/core';
  import {
    TEXT_KEYS,
    VIEWS,
    columnDefs,
    subToneColor,
    toneColor,
    type ViewName
  } from '$lib/holdings-columns';
  import HoldingDrawer from './HoldingDrawer.svelte';

  let {
    holdings,
    totals,
    constants,
    title = 'Holdings',
    view: initialView = 'My holdings' as ViewName,
    pageSize: initialPageSize = 25,
    showAdd = true
  }: {
    holdings: Holding[];
    totals: Totals;
    constants: Constants;
    title?: string;
    view?: ViewName;
    pageSize?: number;
    showAdd?: boolean;
  } = $props();

  // The view and page size are seeded from props and then owned by the user's
  // clicks, so reading the initial value here is the intent.
  // svelte-ignore state_referenced_locally
  let view = $state<ViewName>(initialView);
  let sortKey = $state('value');
  let sortDir = $state<'asc' | 'desc'>('desc');
  let query = $state('');
  let selected = $state<string[]>([]);
  let hidden = $state<string[]>([]);
  let ccy = $state<'USD' | 'local'>('USD');
  let showSold = $state(false);
  // svelte-ignore state_referenced_locally
  let size = $state(initialPageSize);
  let page = $state(0);
  let menu = $state<string | null>(null);
  let hover = $state<string | null>(null);
  let hdr = $state<string | null>(null);
  let panel = $state<string | null>(null);

  /** In USD mode everything is '$'; in local mode a foreign holding shows its code. */
  const currencyFor = (h?: Holding) =>
    ccy === 'USD' || !h ? '$' : h.p.currency === 'USD' ? '$' : `${h.p.currency} `;

  const defs = $derived(columnDefs(currencyFor));
  const cols = $derived(VIEWS[view].filter((k) => !hidden.includes(`${view}:${k}`)));

  const filtered = $derived.by(() => {
    let list = showSold ? holdings : holdings.filter((h) => h.p.status === 'open');
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((h) =>
        `${h.p.ticker} ${h.p.name} ${h.p.sector} ${h.p.assetClass}`.toLowerCase().includes(q)
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    const acc = sortKey === 'holding' ? (h: Holding) => h.p.ticker : (defs[sortKey]?.sort ?? ((h: Holding) => h.p.value));
    return list.slice().sort((a, b) => {
      const x = acc(a);
      const y = acc(b);
      if (typeof x === 'string' || typeof y === 'string') return String(x).localeCompare(String(y)) * dir;
      return (x - y) * dir;
    });
  });

  const pages = $derived(Math.max(1, Math.ceil(filtered.length / size)));
  const currentPage = $derived(Math.min(page, pages - 1));
  const paged = $derived(filtered.slice(currentPage * size, currentPage * size + size));
  const from = $derived(filtered.length ? currentPage * size + 1 : 0);
  const to = $derived(Math.min(filtered.length, (currentPage + 1) * size));

  function setSort(k: string) {
    if (sortKey === k) sortDir = sortDir === 'desc' ? 'asc' : 'desc';
    else {
      sortKey = k;
      sortDir = TEXT_KEYS.includes(k) ? 'asc' : 'desc';
    }
    menu = null;
  }

  const arrow = (k: string) => (sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '');

  const gridCols = $derived(`36px 232px ${cols.map((k) => `${defs[k].w}px`).join(' ')} 44px`);
  const minWidth = $derived(`${36 + 232 + cols.reduce((s, k) => s + defs[k].w, 0) + 44}px`);

  const allSelected = $derived(paged.length > 0 && paged.every((h) => selected.includes(h.p.ticker)));
  const someSelected = $derived(paged.some((h) => selected.includes(h.p.ticker)));

  function toggleAll() {
    const tickers = paged.map((h) => h.p.ticker);
    selected = allSelected
      ? selected.filter((t) => !tickers.includes(t))
      : [...selected, ...tickers.filter((t) => !selected.includes(t))];
  }

  function toggleColumn(k: string) {
    const id = `${view}:${k}`;
    hidden = hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id];
  }

  function switchView(v: ViewName) {
    view = v;
    page = 0;
    menu = null;
    // Keep the sort if the new view still has that column, else fall back.
    if (!VIEWS[v].includes(sortKey) && sortKey !== 'holding') sortKey = 'value';
  }

  const rowBg = (t: string) =>
    hover === t ? 'var(--hover)' : selected.includes(t) ? 'var(--accent-soft)' : 'var(--card)';

  const totalCells = $derived(cols.map((k) => defs[k].total(totals, constants, holdings)));

  const countLabel = $derived(
    `${totals.holdings} open positions${showSold ? ` · ${totals.soldCount} sold shown` : ''} · ${constants.baseCurrency}`
  );

  const addRows = [
    { group: 'Holdings' },
    { label: 'New trade / holding', d: 'M12 5v14M5 12h14', href: '/portfolio/transactions' },
    { label: 'New dividend income', d: 'M4 8h13l-3-3M20 16H7l3 3', href: '/portfolio/transactions' },
    { label: 'Manage cash', d: 'M3 7h15a3 3 0 0 1 3 3v7H3V7Zm0 0V5h12', href: '/portfolio/cash' },
    { sep: true },
    { group: 'Other' },
    { label: 'New corporate action', d: 'M4 6h6l10 12h-4M20 6h-4L6 18H4', href: '/portfolio/corporate-actions' }
  ];

  /** Deep link: /portfolio/holdings#GLDI opens that position's drawer. */
  $effect(() => {
    const open = () => {
      const t = decodeURIComponent(String(window.location.hash || '').replace('#', '')).toUpperCase();
      if (!t) return;
      if (holdings.some((h) => h.p.ticker === t && h.p.status === 'open')) {
        panel = t;
        query = '';
        page = 0;
      }
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  });
</script>

<svelte:window onclick={() => (menu = null)} />

<div style="display:flex;flex-direction:column;gap:14px;position:relative">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
    <div style="display:flex;flex-direction:column;gap:3px">
      <span style="font-size:14px;font-weight:600;color:var(--t1)">{title}</span>
      <span style="font-size:12px;color:var(--t3)">{countLabel}</span>
    </div>
    {#if showAdd}
      <div style="position:relative;flex:none">
        <button
          onclick={(e) => {
            e.stopPropagation();
            menu = menu === 'add' ? null : 'add';
          }}
          style="display:flex;align-items:center;gap:7px;height:32px;padding:0 14px;border:none;border-radius:999px;background:var(--accent);color:var(--on-accent);font-size:13px;font-weight:500;cursor:pointer"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add investments
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {#if menu === 'add'}
          <div
            role="menu" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}
            style="position:absolute;top:38px;right:0;z-index:40;width:264px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px"
          >
            {#each addRows as r, i (r.label ?? r.group ?? `sep-${i}`)}
              {#if r.group}
                <div style="padding:8px 10px 4px;font-size:11px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:var(--t3)">{r.group}</div>
              {:else if r.sep}
                <div style="height:1px;background:var(--line);margin:6px 4px"></div>
              {:else}
                <a href={r.href} style="display:flex;align-items:center;gap:11px;height:44px;padding:0 10px;border-radius:6px;text-decoration:none;color:var(--t1);font-size:13px">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d={r.d} /></svg>
                  <span>{r.label}</span>
                </a>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- toolbar -->
  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <div style="display:flex;padding:2px;border:1px solid var(--line);border-radius:7px;gap:2px">
      {#each [{ k: 'local' as const, label: 'In holding currency' }, { k: 'USD' as const, label: 'In USD' }] as opt (opt.k)}
        <button
          onclick={(e) => { e.stopPropagation(); ccy = opt.k; }}
          style="height:26px;padding:0 10px;border:none;border-radius:5px;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;background:{ccy === opt.k ? 'var(--accent-soft)' : 'transparent'};color:{ccy === opt.k ? 'var(--accent)' : 'var(--t2)'}"
          >{opt.label}</button
        >
      {/each}
    </div>

    <button
      onclick={(e) => { e.stopPropagation(); showSold = !showSold; page = 0; }}
      style="display:flex;align-items:center;gap:7px;height:30px;padding:0 10px 0 8px;border:none;background:transparent;color:var(--t2);font-size:12px;cursor:pointer;border-radius:6px"
    >
      <span style="width:15px;height:15px;border:1px solid {showSold ? 'var(--accent)' : 'var(--line)'};border-radius:4px;background:{showSold ? 'var(--accent)' : 'transparent'};color:var(--on-accent);display:flex;align-items:center;justify-content:center;font-size:10px">{showSold ? '✓' : ''}</span>
      Show sold
    </button>

    {#if ccy === 'local'}
      <span style="font-size:11px;color:var(--t3)">all {totals.holdings} positions are USD-listed</span>
    {/if}

    <div style="flex:1;min-width:12px"></div>

    <div style="position:relative">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="1.8" stroke-linecap="round" style="position:absolute;left:9px;top:8px"><circle cx="11" cy="11" r="7" /><path d="M16.6 16.6L21 21" /></svg>
      <input
        bind:value={query}
        oninput={() => (page = 0)}
        onclick={(e) => e.stopPropagation()}
        placeholder="Search"
        style="height:30px;width:186px;padding:0 10px 0 29px;border:1px solid var(--line);border-radius:6px;background:var(--canvas);color:var(--t1);font-size:12px;outline:none"
      />
    </div>

    <!-- sort -->
    <div style="position:relative">
      <button onclick={(e) => { e.stopPropagation(); menu = menu === 'sort' ? null : 'sort'; }} title="Sort" class="icon-btn" style="width:30px;height:30px">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 7h16M6 12h12M9 17h6" /></svg>
      </button>
      {#if menu === 'sort'}
        <div role="menu" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}
          style="position:absolute;top:36px;right:0;z-index:40;width:232px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px;max-height:340px;overflow-y:auto">
          <div style="padding:7px 10px 5px;font-size:11px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:var(--t3)">Sort by</div>
          {#each [{ key: 'holding', label: 'Holding' }, ...cols.map((k) => ({ key: k, label: defs[k].label }))] as o (o.key)}
            <button onclick={() => setSort(o.key)}
              style="display:flex;align-items:center;justify-content:space-between;width:100%;height:38px;padding:0 10px;border:none;border-radius:6px;background:transparent;color:var(--t1);font-size:13px;cursor:pointer;text-align:left">
              <span>{o.label}</span><span style="color:var(--accent);font-size:10px">{arrow(o.key)}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- columns -->
    <div style="position:relative">
      <button onclick={(e) => { e.stopPropagation(); menu = menu === 'cols' ? null : 'cols'; }} title="Columns" class="icon-btn" style="width:30px;height:30px">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></svg>
      </button>
      {#if menu === 'cols'}
        <div role="menu" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}
          style="position:absolute;top:36px;right:0;z-index:40;width:250px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px;max-height:360px;overflow-y:auto">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px 6px">
            <span style="font-size:11px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:var(--t3)">Columns</span>
            <button onclick={() => (hidden = hidden.filter((x) => !x.startsWith(`${view}:`)))}
              style="border:none;background:transparent;color:var(--accent);font-size:11px;font-weight:500;cursor:pointer;padding:0">Reset</button>
          </div>
          <div style="display:flex;align-items:center;gap:9px;height:36px;padding:0 10px;font-size:13px;color:var(--t3)">
            <span style="width:15px;height:15px;border:1px solid var(--line);border-radius:4px;background:var(--hover);display:flex;align-items:center;justify-content:center;font-size:10px">✓</span>
            Holding <span style="font-size:11px;color:var(--t3)">· pinned</span>
          </div>
          {#each VIEWS[view] as k (k)}
            {@const on = cols.includes(k)}
            <button onclick={() => toggleColumn(k)}
              style="display:flex;align-items:center;gap:9px;width:100%;height:36px;padding:0 10px;border:none;border-radius:6px;background:transparent;color:var(--t1);font-size:13px;cursor:pointer;text-align:left">
              <span style="width:15px;height:15px;flex:none;border:1px solid {on ? 'var(--accent)' : 'var(--line)'};border-radius:4px;background:{on ? 'var(--accent)' : 'transparent'};color:var(--on-accent);display:flex;align-items:center;justify-content:center;font-size:10px">{on ? '✓' : ''}</span>
              <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{defs[k].label}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- view tabs -->
  <div style="display:flex;align-items:center;gap:2px;border-bottom:1px solid var(--line)">
    {#each Object.keys(VIEWS) as v (v)}
      <button
        onclick={(e) => { e.stopPropagation(); switchView(v as ViewName); }}
        style="height:36px;padding:0 14px;border:none;border-bottom:2px solid {v === view ? 'var(--accent)' : 'transparent'};background:transparent;color:{v === view ? 'var(--accent)' : 'var(--t2)'};font-size:13px;font-weight:{v === view ? 600 : 500};cursor:pointer;margin-bottom:-1px"
        >{v}</button
      >
    {/each}
  </div>

  {#if selected.length}
    <div style="display:flex;align-items:center;gap:14px;padding:9px 14px;background:var(--accent-soft);border:1px solid var(--line);border-radius:8px">
      <span style="font-size:12px;font-weight:500;color:var(--t1)"
        >{selected.length} {selected.length === 1 ? 'position selected' : 'positions selected'}</span
      >
      <a href="/portfolio/categories" style="font-size:12px;font-weight:500">Assign to category</a>
      <div style="flex:1"></div>
      <button onclick={() => (selected = [])} style="border:none;background:transparent;color:var(--t2);font-size:12px;cursor:pointer;padding:0">Clear</button>
    </div>
  {/if}

  <!-- the table -->
  <div style="position:relative;max-width:100%;border:1px solid var(--line);border-radius:8px;background:var(--card);overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain">
    <div style="min-width:{minWidth}">
      <!-- header -->
      <div style="display:grid;grid-template-columns:{gridCols};align-items:stretch;border-bottom:1px solid var(--line);background:var(--card)">
        <div style="position:sticky;left:0;z-index:3;background:var(--card);display:flex;align-items:center;justify-content:center;padding:10px 0 10px 12px">
          <span role="checkbox" aria-checked={allSelected} tabindex="0" onclick={(e) => { e.stopPropagation(); toggleAll(); }} onkeydown={() => {}}
            style="width:15px;height:15px;border:1px solid {allSelected || someSelected ? 'var(--accent)' : 'var(--line)'};border-radius:4px;background:{allSelected || someSelected ? 'var(--accent)' : 'transparent'};color:var(--on-accent);display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer"
            >{allSelected ? '✓' : someSelected ? '–' : ''}</span>
        </div>
        <div style="position:sticky;left:36px;z-index:3;background:var(--card);display:flex;align-items:center;padding:10px 14px 10px 10px;border-right:1px solid var(--line)">
          <button onclick={() => setSort('holding')} style="display:flex;align-items:center;gap:5px;border:none;background:transparent;padding:0;cursor:pointer;font-size:12px;font-weight:500;color:var(--t2)"
            >Holding<span style="color:var(--accent);font-size:9px">{arrow('holding')}</span></button>
        </div>
        {#each cols as k (k)}
          {@const d = defs[k]}
          <div style="position:relative;display:flex;align-items:center;justify-content:{d.align === 'left' ? 'flex-start' : 'flex-end'};padding:10px 12px">
            <button
              onclick={() => setSort(k)}
              onmouseenter={() => (hdr = k)}
              onmouseleave={() => (hdr = null)}
              style="display:flex;align-items:center;gap:5px;border:none;background:transparent;padding:0;cursor:pointer;font-size:12px;font-weight:500;color:var(--t2);text-align:{d.align ?? 'right'};line-height:1.3;border-bottom:{d.tip ? '1px dotted var(--t3)' : '1px solid transparent'}"
            >
              <span>{d.label}</span><span style="color:var(--accent);font-size:9px">{arrow(k)}</span>
            </button>
            {#if d.tip && hdr === k}
              <span style="position:absolute;top:34px;{d.align === 'left' ? 'left' : 'right'}:8px;z-index:12;width:214px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:9px 11px;font-size:11px;line-height:1.5;color:var(--t2);pointer-events:none;text-align:left;font-weight:400">{d.tip}</span>
            {/if}
          </div>
        {/each}
        <div style="position:sticky;right:0;z-index:3;background:var(--card);border-left:1px solid var(--line);padding:10px 0"></div>
      </div>

      <!-- rows -->
      {#each paged as h (h.p.ticker)}
        {@const t = h.p.ticker}
        {@const bg = rowBg(t)}
        <div
          role="row" tabindex="-1"
          onclick={() => (panel = t)}
          onkeydown={(e) => { if (e.key === 'Enter') panel = t; }}
          onmouseenter={() => (hover = t)}
          onmouseleave={() => (hover = null)}
          style="display:grid;grid-template-columns:{gridCols};align-items:stretch;border-bottom:1px solid var(--line);background:{bg};cursor:pointer"
        >
          <div style="position:sticky;left:0;z-index:2;background:{bg};display:flex;align-items:center;justify-content:center;padding:0 0 0 12px">
            <span role="checkbox" aria-checked={selected.includes(t)} tabindex="0" onkeydown={() => {}}
              onclick={(e) => {
                e.stopPropagation();
                selected = selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t];
              }}
              style="width:15px;height:15px;border:1px solid {selected.includes(t) ? 'var(--accent)' : 'var(--line)'};border-radius:4px;background:{selected.includes(t) ? 'var(--accent)' : 'transparent'};color:var(--on-accent);display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer"
              >{selected.includes(t) ? '✓' : ''}</span>
          </div>

          <div style="position:sticky;left:36px;z-index:2;background:{bg};display:flex;align-items:center;gap:10px;padding:11px 14px 11px 10px;border-right:1px solid var(--line);min-width:0">
            <span class="mono-badge" style="width:30px;height:30px">{h.p.mono}</span>
            <span style="display:flex;flex-direction:column;gap:1px;min-width:0">
              <span style="font-size:13px;font-weight:500;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{h.p.name}</span>
              <span style="display:flex;align-items:center;gap:6px">
                <span style="font-size:12px;color:var(--t3)">{t}</span>
                {#if h.p.status === 'sold'}
                  <span style="font-size:10px;color:var(--t3);border:1px solid var(--line);border-radius:3px;padding:0 4px">sold {h.p.soldDate}</span>
                {/if}
              </span>
            </span>
            {#if h.p.caveat}
              <span title={h.p.caveat} style="flex:none;display:flex;align-items:center;color:var(--amber)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></svg>
              </span>
            {/if}
          </div>

          {#each cols as k (k)}
            {@const c = defs[k].cell(h)}
            <div style="display:flex;flex-direction:column;gap:2px;justify-content:center;align-items:{c.align === 'left' ? 'flex-start' : 'flex-end'};padding:11px 12px">
              <span style="font-size:13px;font-weight:500;line-height:1.3;color:{toneColor(c.tone)};white-space:nowrap">{c.primary}</span>
              <span style="font-size:12px;line-height:1.3;color:{subToneColor(c.tone)};white-space:nowrap">{c.secondary}</span>
            </div>
          {/each}

          <div style="position:sticky;right:0;z-index:2;background:{bg};border-left:1px solid var(--line);display:flex;align-items:center;justify-content:center">
            <button onclick={(e) => { e.stopPropagation(); panel = t; }} title="Open {t}"
              style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border:none;border-radius:6px;background:transparent;color:var(--t3);cursor:pointer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
            </button>
          </div>
        </div>
      {/each}

      <!-- total -->
      <div style="display:grid;grid-template-columns:{gridCols};align-items:stretch;background:var(--card);border-top:1px solid var(--t3)">
        <div style="position:sticky;left:0;z-index:2;background:var(--card)"></div>
        <div style="position:sticky;left:36px;z-index:2;background:var(--card);display:flex;align-items:center;padding:12px 14px 12px 10px;border-right:1px solid var(--line)">
          <span style="font-size:13px;font-weight:600;color:var(--t1)">Total</span>
        </div>
        {#each totalCells as c, i (cols[i])}
          <div style="display:flex;flex-direction:column;gap:2px;justify-content:center;align-items:{c.align === 'left' ? 'flex-start' : 'flex-end'};padding:12px">
            <span style="font-size:13px;font-weight:600;line-height:1.3;color:{toneColor(c.tone)};white-space:nowrap">{c.primary}</span>
            <span style="font-size:12px;line-height:1.3;color:{subToneColor(c.tone)};white-space:nowrap">{c.secondary}</span>
          </div>
        {/each}
        <div style="position:sticky;right:0;z-index:2;background:var(--card);border-left:1px solid var(--line)"></div>
      </div>
    </div>
  </div>

  <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--t3);margin-top:-4px">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" /></svg>
    <span>{cols.length} of {VIEWS[view].length} columns shown · Holding stays fixed, scroll sideways for the rest</span>
  </div>

  <!-- pagination -->
  <div style="display:flex;align-items:center;justify-content:space-between;gap:14px">
    <div style="display:flex;align-items:center;gap:9px">
      <span style="font-size:12px;color:var(--t3)">Rows</span>
      <div style="position:relative">
        <button onclick={(e) => { e.stopPropagation(); menu = menu === 'size' ? null : 'size'; }}
          style="display:flex;align-items:center;gap:7px;height:30px;padding:0 10px;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--t1);font-size:12px;cursor:pointer">{size}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {#if menu === 'size'}
          <div role="menu" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}
            style="position:absolute;bottom:36px;left:0;z-index:40;width:120px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px">
            {#each [10, 25, 50, 100] as n (n)}
              <button onclick={() => { size = n; page = 0; menu = null; }}
                style="display:flex;align-items:center;justify-content:space-between;width:100%;height:36px;padding:0 10px;border:none;border-radius:6px;background:transparent;color:var(--t1);font-size:13px;cursor:pointer;text-align:left">
                <span>{n}</span><span style="color:var(--accent);font-size:12px;opacity:{n === size ? 1 : 0}">✓</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      <span style="font-size:12px;color:var(--t2)">See {from}–{to} from {filtered.length}</span>
      <div style="display:flex;gap:2px">
        <button onclick={() => (page = Math.max(0, currentPage - 1))} aria-label="Previous page"
          style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:1px solid var(--line);border-radius:6px;background:transparent;color:{currentPage > 0 ? 'var(--t2)' : 'var(--t3)'};cursor:pointer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <button onclick={() => (page = Math.min(pages - 1, currentPage + 1))} aria-label="Next page"
          style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:1px solid var(--line);border-radius:6px;background:transparent;color:{currentPage < pages - 1 ? 'var(--t2)' : 'var(--t3)'};cursor:pointer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  </div>
</div>

{#if panel}
  <HoldingDrawer ticker={panel} onclose={() => (panel = null)} />
{/if}
