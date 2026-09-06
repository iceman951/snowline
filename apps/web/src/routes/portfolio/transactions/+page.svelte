<!--
  Portfolio → Transactions. Port of the bundle's Transactions.dc.html.

  The ledger combines opening history with saved user entries. Reconciliation
  checks the generated opening lots against the original position snapshot.
-->
<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { MONTHS, fmt, type LedgerRow } from '@snowline/core';
  import TopNav from '$lib/components/TopNav.svelte';
  import TransactionModal from '$lib/components/TransactionModal.svelte';
  import FilterSelect from '$lib/components/FilterSelect.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const S = $derived(data.screen);
  const K = $derived(S.constants);

  type Tab = 'Trades' | 'Incomes' | 'Expenses' | 'All';
  type SortKey = 'date' | 'shares' | 'price' | 'summ' | 'profit';

  let tab = $state<Tab>('Trades');
  let query = $state('');
  let operationFilter = $state('');
  let period = $state('all');
  let customFrom = $state('');
  let customTo = $state('');
  let today = $state(new Date());
  const filterCount = $derived(Number(Boolean(operationFilter)) + Number(period !== 'all'));
  let sortKey = $state<SortKey>('date');
  let sortDir = $state(-1);
  let limit = $state(40);
  let selected = $state<string[]>([]);
  let deleted = $state<string[]>([]);
  const defaultColumns = { holding: true, date: true, shares: true, notSold: false, days: false, price: true, fee: true, summ: true, profit: true, note: true };
  type ColumnKey = keyof typeof defaultColumns;
  const columnOptions: Array<{ key: ColumnKey; label: string; width: number; sort?: SortKey }> = [
    { key: 'holding', label: 'Holding', width: 218 },
    { key: 'date', label: 'Date', width: 132, sort: 'date' },
    { key: 'shares', label: 'Shares', width: 116, sort: 'shares' },
    { key: 'notSold', label: 'Not sold shares', width: 130 },
    { key: 'days', label: 'Days since purchase', width: 150 },
    { key: 'price', label: 'Price', width: 116, sort: 'price' },
    { key: 'fee', label: 'Fee / Tax', width: 104 },
    { key: 'summ', label: 'Summ', width: 126, sort: 'summ' },
    { key: 'profit', label: 'Total profit', width: 136, sort: 'profit' },
    { key: 'note', label: 'Note', width: 150 }
  ];
  let cols = $state({ ...defaultColumns });
  const activeColumns = $derived(columnOptions.filter(c => cols[c.key]));
  let menu = $state<string | null>(null);
  let filtersOpen = $state(false);
  let reconOpen = $state(false);
  let transactionOpen = $state(false);
  let savedMessage = $state('');
  let ready = $state(false);
  let addButton: HTMLButtonElement;
  let columnsButton: HTMLButtonElement;
  let columnsPanel = $state<HTMLDivElement>();
  onMount(() => { ready = true; today = new Date(); });
  async function toggleColumns() {
    menu = menu === 'cols' ? null : 'cols';
    if (menu === 'cols') { await tick(); columnsPanel?.querySelector<HTMLButtonElement>('button')?.focus(); }
  }
  function clearFilters() { operationFilter = ''; period = 'all'; customFrom = ''; customTo = ''; query = ''; limit = PAGE; selected = []; }
  async function closeTransaction() {
    transactionOpen = false;
    await tick();
    addButton.focus();
  }

  const PAGE = 40;

  /** Row date as a sortable serial. MONTHS is a const tuple, so widen to index it. */
  const MONTH_NAMES: readonly string[] = MONTHS;
  const dateSerial = (d: string) => {
    const p = String(d).split(' ');
    return (+p[2] || 0) * 10000 + (MONTH_NAMES.indexOf(p[1]) + 1) * 100 + (+p[0] || 0);
  };
  const dateTime = (date: string) => {
    const [day, month, year] = date.split(' ');
    return Date.UTC(Number(year), MONTH_NAMES.indexOf(month), Number(day));
  };
  const todayTime = $derived(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const periodOptions = [
    { value: '7d', label: 'over last 7 days' },
    { value: '1m', label: 'over last month' },
    { value: '3m', label: 'over last 3 months' },
    { value: '6m', label: 'over last 6 months' },
    { value: 'ytd', label: 'year to date' },
    { value: '1y', label: 'over the last year' },
    { value: '5y', label: 'over last 5 years' },
    { value: 'all', label: 'all time' },
    { value: 'custom', label: 'Choose a period' }
  ];
  /** How far back each relative period reaches, in calendar months. */
  const monthsBack: Record<string, number> = { '1m': 1, '3m': 3, '6m': 6, '1y': 12, '5y': 60 };
  const operationOptions = $derived([
    { value: '', label: 'All transactions' },
    ...(tab === 'Trades'
      ? ['Buy', 'Sell']
      : tab === 'Incomes'
        ? ['Dividends']
        : tab === 'Expenses'
          ? ['Fee', 'Tax']
          : ['Buy', 'Sell', 'Dividends', 'Fee', 'Tax']
    ).map((operation) => ({ value: operation, label: operation }))
  ]);
  /** Bounds are half-open [from, to): the end runs to midnight after today. */
  const dateBounds = $derived.by(() => {
    const end = todayTime + 86400000;
    if (period === '7d') return [todayTime - 6 * 86400000, end];
    if (period in monthsBack) {
      const from = new Date(todayTime);
      from.setUTCMonth(from.getUTCMonth() - monthsBack[period]);
      return [from.getTime(), end];
    }
    if (period === 'ytd') return [Date.UTC(today.getFullYear(), 0, 1), end];
    if (period === 'custom') {
      if (!customFrom && !customTo) return null;
      const from = customFrom ? Date.parse(customFrom + 'T00:00:00Z') : -Infinity;
      const to = customTo ? Date.parse(customTo + 'T00:00:00Z') + 86400000 : Infinity;
      return [from, to];
    }
    return null;
  });
  /** The button reads back the chosen dates rather than "Choose a period". */
  const periodDisplay = $derived(
    period === 'custom' && (customFrom || customTo)
      ? `${customFrom || 'start'} → ${customTo || 'today'}`
      : undefined
  );

  const visible = $derived(S.rows.filter((r) => !deleted.includes(r.id)));

  const filtered = $derived.by(() => {
    let list = visible.filter((r) =>
      tab === 'All' ? true : r.kind === (tab === 'Trades' ? 'trade' : tab === 'Incomes' ? 'income' : 'expense')
    );
    if (operationFilter) list = list.filter(r => r.operation === operationFilter);
    if (dateBounds) list = list.filter(r => dateTime(r.date) >= dateBounds[0] && dateTime(r.date) < dateBounds[1]);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        `${r.ticker} ${r.name} ${r.operation} ${r.date} ${r.note ?? ''}`.toLowerCase().includes(q)
      );
    }
    return list;
  });

  /** Per-row profit: an income row books its cash, a trade marks to market. */
  function profitOf(r: LedgerRow) {
    if (r.kind === 'expense') return { primary: fmt.signed(r.signed), secondary: 'Expense', tone: 'neg' as const };
    const p = S.prices[r.ticker];
    if (r.kind === 'income') {
      return {
        primary: fmt.signed(r.signed),
        secondary: r.tax > 0 ? `after ${fmt.money(r.tax)} tax` : 'no tax withheld',
        tone: 'pos' as const
      };
    }
    if (!p) return { primary: '—', secondary: 'no price feed', tone: 'plain' as const };
    if (r.operation === 'Sell') {
      const cost = r.costBasis ?? p.soldCost ?? r.amount;
      const gain = (r.updateCash !== undefined ? r.signed : r.amount) - cost;
      return {
        primary: fmt.caret(cost ? (gain / cost) * 100 : 0),
        secondary: fmt.signed(gain),
        tone: fmt.tone(gain)
      };
    }
    const cost = r.amount + (r.updateCash !== undefined ? r.fee : 0);
    const gain = r.shares * p.price - cost;
    return {
      primary: fmt.caret(cost ? (gain / cost) * 100 : 0),
      secondary: fmt.signed(gain),
      tone: fmt.tone(gain)
    };
  }

  const sorted = $derived.by(() => {
    const acc: Record<SortKey, (r: LedgerRow) => number> = {
      date: (r) => dateSerial(r.date),
      shares: (r) => r.shares,
      price: (r) => r.price,
      summ: (r) => r.signed,
      profit: (r) => {
        if (r.kind === 'expense') return r.signed;
        const p = S.prices[r.ticker];
        if (r.kind === 'income') return r.signed;
        if (!p) return 0;
        return r.operation === 'Sell'
          ? (r.updateCash !== undefined ? r.signed : r.amount) - (r.costBasis ?? p.soldCost ?? r.amount)
          : r.shares * p.price - r.amount - (r.updateCash !== undefined ? r.fee : 0);
      }
    };
    return filtered.slice().sort((a, b) => (acc[sortKey](a) - acc[sortKey](b)) * sortDir);
  });

  const shown = $derived(sorted.slice(0, limit));

  /** Totals follow the filter, so the strip always describes what is on screen. */
  const totals = $derived.by(() => {
    const pick = (f: (x: LedgerRow) => boolean) =>
      filtered.filter(f).reduce((s, x) => s + x.amount, 0);
    return {
      buy: pick((x) => x.operation === 'Buy'),
      sell: pick((x) => x.operation === 'Sell'),
      income: filtered.filter(x => x.kind === 'income').reduce((s, x) => s + x.signed, 0),
      fee: filtered.reduce((s, x) => s + x.fee, 0),
      tax: filtered.reduce((s, x) => s + x.tax, 0)
    };
  });

  const summary = $derived(
    tab === 'Expenses'
      ? [
          { label: 'Fees', value: fmt.money(totals.fee), color: 'var(--tag-fg)' },
          { label: 'Taxes', value: fmt.money(totals.tax), color: 'var(--neg)' }
        ]
      : tab === 'Incomes'
      ? [
          { label: 'Income', value: fmt.money(totals.income), color: 'var(--accent-3)' },
          { label: 'Tax withheld', value: fmt.money(totals.tax), color: 'var(--tag-fg)' }
        ]
      : [
          { label: 'Buy', value: fmt.money(totals.buy), color: 'var(--accent)' },
          { label: 'Sell', value: fmt.money(totals.sell), color: 'var(--neg)' },
          { label: 'Fee', value: fmt.money(totals.fee), color: '#a78bfa' },
          ...(tab === 'All' ? [{ label: 'Income', value: fmt.money(totals.income), color: 'var(--accent-3)' }] : [])
        ]
  );

  function setSort(k: SortKey) {
    if (sortKey === k) sortDir = -sortDir;
    else {
      sortKey = k;
      sortDir = -1;
    }
    limit = PAGE;
  }

  const opTone = (op: string) =>
    op === 'Buy'
      ? { bg: 'var(--accent-soft)', fg: 'var(--accent)' }
      : op === 'Sell'
        ? { bg: 'var(--neg-soft)', fg: 'var(--neg)' }
        : op === 'Dividends'
          ? { bg: 'var(--hover)', fg: 'var(--t1)' }
          : { bg: 'var(--tag-bg)', fg: 'var(--tag-fg)' };

  const gridCols = $derived(['44px', '110px', ...activeColumns.map(c => c.key === 'note' ? 'minmax(150px,1fr)' : `${c.width}px`)].join(' '));
  const minWidth = $derived(`${154 + activeColumns.reduce((sum, c) => sum + c.width, 0)}px`);

  const allOn = $derived(shown.length > 0 && shown.every((r) => selected.includes(r.id)));

  /** A reconciliation row is only interesting when something failed to close. */
  const reconIssues = $derived(
    S.reconciliation.filter(
      (r) => Math.abs(r.sharesDelta) > 1e-5 || Math.abs(r.costDelta) > 0.01 || Math.abs(r.incomeDelta) > 0.01
    )
  );

  const tone = (t: 'pos' | 'neg' | 'plain') =>
    t === 'pos' ? 'var(--accent)' : t === 'neg' ? 'var(--neg)' : 'var(--t1)';
  const subTone = (t: 'pos' | 'neg' | 'plain') =>
    t === 'pos' ? 'var(--accent)' : t === 'neg' ? 'var(--neg)' : 'var(--t2)';

  const searchItems = $derived(
    Object.keys(S.prices)
      .filter((tk) => S.prices[tk].status === 'open')
      .map((tk) => {
        const row = S.rows.find((r) => r.ticker === tk)!;
        return {
          ticker: tk,
          name: row?.name ?? tk,
          mono: row?.mono ?? tk.slice(0, 2),
          sector: '',
          value: fmt.money(S.prices[tk].price),
          href: `/portfolio/holdings#${tk}`
        };
      })
  );

  const headers = $derived([
    { key: undefined, label: 'Operation', justify: 'flex-start' },
    ...activeColumns.map(c => ({ key: c.sort, label: c.label, justify: ['holding', 'date', 'note'].includes(c.key) ? 'flex-start' : 'flex-end' }))
  ]);
</script>

<svelte:head><title>Transactions · Snowline</title></svelte:head>
<svelte:window onclick={() => (menu = null)} onkeydown={(event) => {
  if (event.key === 'Escape' && menu === 'cols') { menu = null; columnsButton.focus(); }
}} />

<TopNav
  active="Portfolio"
  subActive="Transactions"
  portfolioName={K.portfolioName}
  holdingsCount={S.totals.holdings}
  {searchItems}
  accountSub={`${K.baseCurrency} · ${S.totals.holdings} holdings`}
/>

<main
  data-r="main"
  style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:18px"
>
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
    <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
      <div style="display:flex;align-items:center;gap:9px">
        <h1 style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)">
          Transactions
        </h1>
        <span style="font-size:13px;color:var(--t3);padding-top:6px">{K.portfolioName}</span>
      </div>
      <div style="display:flex;align-items:center;gap:9px;font-size:12px;color:var(--t3)">
        <span>{visible.length} transactions · {S.instrumentCount} instruments</span>
        <span style="width:1px;height:10px;background:var(--line)"></span>
        <span>{fmt.money(S.ledgerTotals.buy)} in buys · {fmt.money(S.totals.invested)} in open positions</span>
      </div>
    </div>
  </div>

  {#if savedMessage}<p class="saved-message" role="status">{savedMessage}</p>{/if}

  <div class="transaction-tabs">
      {#each ['Trades', 'Incomes', 'Expenses', 'All'] as const as t (t)}
        <button
          disabled={!ready}
          onclick={() => { tab = t; operationFilter = ''; limit = PAGE; selected = []; }}
          style="height:34px;padding:0 13px;border:none;border-bottom:2px solid {tab === t ? 'var(--accent)' : 'transparent'};background:transparent;color:{tab === t ? 'var(--t1)' : 'var(--t2)'};font-size:13px;font-weight:{tab === t ? 600 : 500};cursor:pointer;margin-bottom:-1px"
          >{t}</button
        >
      {/each}
  </div>

  <!-- Add sits below the tabs, opposite search and filters. -->
  <div class="transaction-toolbar">
    <button type="button" class="add-transaction" aria-label="Add transaction" bind:this={addButton} disabled={!ready} onclick={() => { savedMessage = ''; transactionOpen = true; }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      Add
    </button>

    <div style="flex:1;min-width:12px"></div>

    <div style="position:relative">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="1.8" stroke-linecap="round" style="position:absolute;left:9px;top:8px"><circle cx="11" cy="11" r="7" /><path d="M16.6 16.6L21 21" /></svg>
      <input
        disabled={!ready}
        bind:value={query}
        oninput={() => (limit = PAGE)}
        onclick={(e) => e.stopPropagation()}
        placeholder="Search"
        style="height:30px;width:196px;padding:0 10px 0 29px;border:1px solid var(--line);border-radius:6px;background:var(--canvas);color:var(--t1);font-size:12px;outline:none"
      />
    </div>

    <button
      class="filter-button" class:active={filtersOpen || filterCount > 0} disabled={!ready}
      aria-expanded={filtersOpen} aria-controls="transaction-filters"
      onclick={(e) => { e.stopPropagation(); filtersOpen = !filtersOpen; menu = null; }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
      {filterCount ? `Filters · ${filterCount}` : 'Filters'}
    </button>

    <div class="columns-control">
      <button bind:this={columnsButton} disabled={!ready} onclick={(e) => { e.stopPropagation(); toggleColumns(); }} title="Columns" aria-label="Table columns"
        aria-expanded={menu === 'cols'} aria-controls="transaction-columns" class="columns-button" class:active={menu === 'cols'}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="6" rx="3" /><rect x="3" y="14" width="18" height="6" rx="3" /><circle cx="16" cy="7" r="1.5" fill="currentColor" /><circle cx="8" cy="17" r="1.5" fill="currentColor" /></svg>
      </button>
      {#if menu === 'cols'}
        <div bind:this={columnsPanel} id="transaction-columns" role="dialog" aria-label="Table columns" tabindex="-1"
          class="columns-popover" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
          <div class="columns-actions"><button type="button" onclick={() => { cols = { ...defaultColumns }; sortKey = 'date'; sortDir = -1; }}>By default</button></div>
          <div class="columns-options">
            {#each columnOptions as c (c.key)}
              <button type="button" role="switch" aria-checked={cols[c.key]} class="column-toggle"
                onclick={() => { cols = { ...cols, [c.key]: !cols[c.key] }; }}>
                <span class="switch-track" class:on={cols[c.key]} aria-hidden="true"><span></span></span>
                {c.label}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  {#if filtersOpen}
    <div id="transaction-filters" class="transaction-filters">
      <FilterSelect
        label="Transaction operation"
        value={operationFilter}
        options={operationOptions}
        onselect={(next) => { operationFilter = next; limit = PAGE; selected = []; }}
      />
      <FilterSelect
        label="Transaction period"
        value={period}
        options={periodOptions}
        display={periodDisplay}
        width={200}
        onselect={(next) => {
          period = next;
          if (next !== 'custom') { customFrom = ''; customTo = ''; }
          limit = PAGE;
          selected = [];
        }}
      />
      {#if period === 'custom'}
        <label class="period-field">From
          <input type="date" bind:value={customFrom} oninput={() => { limit = PAGE; selected = []; }} />
        </label>
        <label class="period-field">To
          <input type="date" bind:value={customTo} oninput={() => { limit = PAGE; selected = []; }} />
        </label>
      {/if}
      <button type="button" class="clear-filters" onclick={clearFilters}>Clear filters</button>
    </div>
  {/if}

  <div class="transaction-summary" role="group" aria-label="Transaction totals">
    {#each summary as s (s.label)}
      <div class="summary-item">
        <span class="summary-label"><span class="summary-dot" style:background={s.color}></span>{s.label}</span>
        <span class="summary-value">{s.value}</span>
      </div>
    {/each}
  </div>

  {#if selected.length}
    <div style="display:flex;align-items:center;gap:14px;padding:9px 14px;background:var(--accent-soft);border:1px solid var(--line);border-radius:8px">
      <span style="font-size:12px;font-weight:500;color:var(--t1)">{selected.length} selected</span>
      <div style="flex:1"></div>
      <button onclick={() => { deleted = [...deleted, ...selected]; selected = []; }}
        style="border:none;background:transparent;color:var(--neg);font-size:12px;font-weight:500;cursor:pointer;padding:0">Remove from view</button>
      <button onclick={() => (selected = [])} style="border:none;background:transparent;color:var(--t2);font-size:12px;cursor:pointer;padding:0">Clear</button>
    </div>
  {/if}

  <!-- table -->
  <div style="position:relative;max-width:100%;border:1px solid var(--line);border-radius:8px;background:var(--card);overflow-x:auto">
    <div style="min-width:{minWidth}">
      <div style="display:grid;grid-template-columns:{gridCols};border-bottom:1px solid var(--line)">
        <div style="display:flex;align-items:center;justify-content:center;padding:10px 0 10px 12px">
          <span role="checkbox" aria-checked={allOn} tabindex="0" onkeydown={() => {}}
            onclick={(e) => { e.stopPropagation(); selected = allOn ? [] : shown.map((r) => r.id); }}
            style="width:15px;height:15px;border:1px solid {allOn ? 'var(--accent)' : 'var(--line)'};border-radius:4px;background:{allOn ? 'var(--accent)' : 'transparent'};color:var(--on-accent);display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer">{allOn ? '✓' : ''}</span>
        </div>
        {#each headers as h, i (h.label + i)}
          <div style="display:flex;align-items:center;justify-content:{h.justify};padding:10px 12px">
            {#if h.key}
              <button onclick={() => { if (h.key) setSort(h.key); }}
                style="display:flex;align-items:center;gap:5px;border:none;background:transparent;padding:0;cursor:pointer;font-size:12px;font-weight:500;color:{sortKey === h.key ? 'var(--t1)' : 'var(--t2)'}">
                {h.label}<span style="color:var(--accent);font-size:9px;opacity:{sortKey === h.key ? 1 : 0}">{sortDir < 0 ? '▼' : '▲'}</span>
              </button>
            {:else}
              <span style="font-size:12px;font-weight:500;color:var(--t2)">{h.label}</span>
            {/if}
          </div>
        {/each}
      </div>

      {#each shown as r (r.id)}
        {@const isSel = selected.includes(r.id)}
        {@const t = opTone(r.operation)}
        {@const pf = profitOf(r)}
        <div style="display:grid;grid-template-columns:{gridCols};border-bottom:1px solid var(--line);background:{isSel ? 'var(--accent-soft)' : 'var(--card)'}">
          <div style="display:flex;align-items:center;justify-content:center;padding:0 0 0 12px">
            <span role="checkbox" aria-checked={isSel} tabindex="0" onkeydown={() => {}}
              onclick={() => (selected = isSel ? selected.filter((x) => x !== r.id) : [...selected, r.id])}
              style="width:15px;height:15px;border:1px solid {isSel ? 'var(--accent)' : 'var(--line)'};border-radius:4px;background:{isSel ? 'var(--accent)' : 'transparent'};color:var(--on-accent);display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer">{isSel ? '✓' : ''}</span>
          </div>

          <div style="display:flex;align-items:center;padding:11px 12px">
            <span style="font-size:11px;font-weight:500;padding:3px 9px;border-radius:999px;background:{t.bg};color:{t.fg};white-space:nowrap">{r.operation}</span>
          </div>

          {#each activeColumns as column (column.key)}
            <div class="transaction-cell" class:cell-left={['holding', 'date', 'note'].includes(column.key)} data-column={column.key}>
              {#if column.key === 'holding'}
                <div class="holding-cell">
                  <span class="mono-badge" style="width:28px;height:28px;flex:none">{r.mono}</span>
                  <span class="holding-details">
                    {#if r.ticker}<a href="/portfolio/holdings#{r.ticker}">{r.name}</a>{:else}<span>{r.name}</span>{/if}
                    <span class="cell-secondary">{r.ticker || 'Portfolio'}</span>
                  </span>
                </div>
              {:else if column.key === 'date'}
                <span>{r.date}</span>
              {:else if column.key === 'shares'}
                <span>{r.kind === 'expense' ? '—' : fmt.shares(r.shares)}</span>
                <span class="cell-secondary">{r.kind === 'expense' ? '' : 'shares'}</span>
              {:else if column.key === 'notSold'}
                <span title="Remaining shares using FIFO, adjusted for completed splits">{r.operation === 'Buy' ? fmt.shares(S.remainingShares[r.id] ?? 0) : '—'}</span>
              {:else if column.key === 'days'}
                <span>{r.operation === 'Buy' && dateTime(r.date) <= todayTime ? Math.floor((todayTime - dateTime(r.date)) / 86400000).toLocaleString() : '—'}</span>
              {:else if column.key === 'price'}
                <span>{r.kind === 'expense' ? '—' : fmt.money(r.price)}</span>
                <span class="cell-secondary">{r.kind === 'expense' ? '' : 'per share'}</span>
              {:else if column.key === 'fee'}
                <span>{r.fee ? fmt.money(r.fee) : '—'}</span>
                <span class="cell-secondary">{r.tax ? fmt.money(r.tax) + ' tax' : 'no tax'}</span>
              {:else if column.key === 'summ'}
                <span style:color={r.signed >= 0 ? 'var(--accent)' : 'var(--t1)'}>{fmt.signed(r.signed)}</span>
                <span class="cell-secondary">{r.signed >= 0 ? 'in' : 'out'}</span>
              {:else if column.key === 'profit'}
                <span style:color={tone(pf.tone)}>{pf.primary}</span>
                <span class="cell-secondary" style:color={subTone(pf.tone)}>{pf.secondary}</span>
              {:else if column.key === 'note'}
                <span class="cell-note" title={r.note}>{r.note}</span>
              {/if}
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>

  <div style="display:flex;align-items:center;justify-content:space-between;gap:14px">
    <span style="font-size:12px;color:var(--t2)">Showing {shown.length} of {filtered.length}</span>
    {#if shown.length < filtered.length}
      <button onclick={() => (limit += PAGE)}
        style="height:30px;padding:0 14px;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--t1);font-size:12px;font-weight:500;cursor:pointer">Load more</button>
    {/if}
  </div>

  <!-- reconciliation -->
  <div class="card">
    <button
      onclick={() => (reconOpen = !reconOpen)}
      style="display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:15px 20px;border:none;background:transparent;cursor:pointer;text-align:left"
    >
      <span style="display:flex;align-items:center;gap:10px">
        <span class="card-title">Reconciliation</span>
        <span class="card-note">generated history against opening positions</span>
      </span>
      <span style="display:flex;align-items:center;gap:9px">
        <span style="font-size:12px;font-weight:500;color:{reconIssues.length ? 'var(--neg)' : 'var(--accent)'}">
          {reconIssues.length ? `${reconIssues.length} not closing` : 'All positions reconcile'}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2.2" stroke-linecap="round" style="transform:rotate({reconOpen ? 180 : 0}deg)"><path d="M6 9l6 6 6-6" /></svg>
      </span>
    </button>

    {#if reconOpen}
      <div style="border-top:1px solid var(--line);padding:4px 20px 16px">
        <div style="display:grid;grid-template-columns:minmax(0,1fr) 120px 120px 120px 120px;gap:12px;padding:10px 0;border-bottom:1px solid var(--line);font-size:12px;font-weight:500;color:var(--t2)">
          <span>Holding</span>
          <span style="text-align:right">Shares Δ</span>
          <span style="text-align:right">Cost Δ</span>
          <span style="text-align:right">Income Δ</span>
          <span style="text-align:right">Basis cut</span>
        </div>
        {#each S.reconciliation as r (r.ticker)}
          <div style="display:grid;grid-template-columns:minmax(0,1fr) 120px 120px 120px 120px;gap:12px;padding:9px 0;border-bottom:1px solid var(--line);font-size:12px">
            <span style="display:flex;align-items:center;gap:7px;color:var(--t1)">
              {r.ticker}
              {#if r.splitAdjusted}
                <span style="font-size:10px;color:var(--t3);border:1px solid var(--line);border-radius:3px;padding:0 4px">split-adjusted</span>
              {/if}
            </span>
            <span style="text-align:right;color:{Math.abs(r.sharesDelta) > 1e-5 ? 'var(--neg)' : 'var(--t3)'}">{r.sharesDelta.toFixed(5)}</span>
            <span style="text-align:right;color:{Math.abs(r.costDelta) > 0.01 ? 'var(--neg)' : 'var(--t3)'}">{fmt.money(r.costDelta)}</span>
            <span style="text-align:right;color:{Math.abs(r.incomeDelta) > 0.01 ? 'var(--neg)' : 'var(--t3)'}">{fmt.money(r.incomeDelta)}</span>
            <span style="text-align:right;color:var(--t3)">{r.basisAdjust ? fmt.money(r.basisAdjust) : '—'}</span>
          </div>
        {/each}
        <p style="margin:12px 0 0;font-size:11px;color:var(--t3);line-height:1.55">
          Buy shares are re-adjusted through each ticker's split chain and any return of capital is
          subtracted from the original purchase cost, so a corporate action cannot silently break
          the proof. Income rows reconcile per holding and in total; an individual month will not
          match the received-dividend series, which the value charts are built from.
        </p>
      </div>
    {/if}
  </div>

  <p style="margin:0;font-size:11px;color:var(--t3)">
    New transactions are saved to your portfolio. Reconciliation above covers the opening history;
    added transactions are applied separately to holdings and, when selected, the cash balance.
  </p>
</main>

{#if transactionOpen}
  <TransactionModal assets={S.assets} cashBalance={S.cashBalance}
    initialKind={tab === 'Incomes' ? 'income' : tab === 'Expenses' ? 'expense' : 'trade'}
    onclose={closeTransaction}
    onsaved={(kind) => {
      tab = kind === 'trade' ? 'Trades' : kind === 'income' ? 'Incomes' : 'Expenses';
      clearFilters(); limit = PAGE; sortKey = 'date'; sortDir = -1; selected = [];
      savedMessage = 'Transaction saved.';
    }} />
{/if}

<style>
  .transaction-tabs { display: flex; align-items: center; gap: 2px; border-bottom: 1px solid var(--line); }
  .transaction-toolbar { position: relative; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .add-transaction { display: inline-flex; align-items: center; gap: 7px; min-height: 44px; padding: 10px 14px; border: 1px solid transparent; border-radius: 6px; background: var(--accent-soft); color: var(--accent); font-size: 13px; font-weight: 600; cursor: pointer; }
  .add-transaction:hover { filter: brightness(1.08); }
  .add-transaction:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  .saved-message { margin: 0; padding: 10px 14px; background: var(--accent-soft); color: var(--accent); border-radius: 6px; font-size: 13px; }
  .transaction-summary { display: flex; flex-wrap: wrap; align-self: flex-start; gap: 20px; max-width: 100%; padding: 12px 16px; border: 1px solid var(--line); border-radius: 6px; background: var(--card); margin-top: -4px; }
  .summary-item { display: flex; flex-direction: column; gap: 3px; }
  .summary-label { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--t2); }
  .summary-dot { width: 4px; height: 4px; border-radius: 50%; }
  .summary-value { font-size: 13px; font-weight: 500; color: var(--t1); white-space: nowrap; }
  .filter-button, .columns-button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 40px; padding: 0 13px; border: 1px solid var(--line); border-radius: 6px; background: var(--card); color: var(--t2); font-size: 12px; font-weight: 600; cursor: pointer; }
  .columns-button { width: 40px; padding: 0; }
  .active { background: var(--accent-soft); color: var(--accent); border-color: var(--accent-tint); }
  .transaction-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: -4px; }
  .period-field { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--t2); }
  .period-field input { height: 42px; padding: 0 10px; font: inherit; font-size: 13px; color: var(--t1); background: var(--card); border: 1px solid var(--line); border-radius: 5px; }
  .clear-filters { min-height: 42px; padding: 0 15px; border: 0; border-radius: 5px; background: var(--accent-soft); color: var(--accent); font-size: 13px; font-weight: 600; cursor: pointer; }
  .columns-control { position: relative; }
  .columns-popover { position: absolute; top: calc(100% + 8px); right: 0; z-index: 40; width: 478px; max-width: calc(100vw - 32px); padding: 16px 14px; background: var(--card); border: 1px solid var(--line); border-radius: 6px; box-shadow: var(--shadow); }
  .columns-actions { display: flex; justify-content: flex-end; margin-bottom: 8px; }
  .columns-actions button { padding: 4px 0; border: 0; background: transparent; color: var(--accent); font-size: 12px; cursor: pointer; }
  .columns-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 20px; }
  .column-toggle { display: flex; align-items: center; gap: 9px; min-height: 33px; padding: 3px 0; text-align: left; border: 0; background: transparent; color: var(--t1); font-size: 12px; cursor: pointer; }
  .switch-track { display: block; flex: none; width: 38px; height: 22px; padding: 2px; border-radius: 20px; background: var(--line); }
  .switch-track span { display: block; width: 18px; height: 18px; border-radius: 50%; background: var(--t3); transition: transform .15s, background .15s; }
  .switch-track.on { background: var(--accent-tint); }
  .switch-track.on span { transform: translateX(16px); background: var(--accent); }
  .transaction-cell { display: flex; flex-direction: column; justify-content: center; align-items: flex-end; min-width: 0; padding: 11px 12px; color: var(--t1); font-size: 13px; white-space: nowrap; }
  .cell-left { align-items: flex-start; }
  .holding-cell { display: flex; align-items: center; gap: 10px; min-width: 0; max-width: 100%; }
  .holding-details { display: flex; flex-direction: column; min-width: 0; }
  .holding-details a, .holding-details > span:first-child { overflow: hidden; text-overflow: ellipsis; color: var(--t1); font-weight: 500; }
  .cell-secondary { color: var(--t3); font-size: 11px; }
  .cell-note { overflow: hidden; text-overflow: ellipsis; max-width: 100%; color: var(--t3); font-size: 12px; }
  .column-toggle:focus-visible, .columns-actions button:focus-visible, .filter-button:focus-visible, .columns-button:focus-visible, .transaction-filters :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  @media (max-width: 600px) {
    .columns-control { position: static; }
    .columns-popover { width: 100%; max-width: 100%; }
    .columns-options { gap: 3px 10px; }
    .column-toggle { font-size: 11px; gap: 6px; }
    .period-field { flex: 1 1 140px; min-width: 0; }
    .period-field input { flex: 1; min-width: 0; }
  }
</style>
