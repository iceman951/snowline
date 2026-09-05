<!--
  The per-holding drawer behind a table row: price series, the summary grid,
  recent trades and recent payments.

  Detail is fetched on open rather than shipped with the table — a drawer is
  opened for one position at a time, and the price series alone is 60 points
  per ticker.
-->
<script lang="ts">
  import { fmt, type CorporateAction, type Holding } from '@snowline/core';

  let { ticker, onclose }: { ticker: string; onclose: () => void } = $props();

  interface Detail {
    holding: Holding;
    transactions: Array<{ date: string; type: string; shares: number; price: number; total: number }>;
    dividends: Array<{ payDate: string; perShare: number; gross: number; net: number }>;
    priceSeries: number[];
    corporateActions: CorporateAction[];
  }

  let detail = $state<Detail | null>(null);
  let error = $state<string | null>(null);
  let range = $state<'1m' | '3m' | '1y' | 'all'>('1y');
  let note = $state('');

  const RANGE_POINTS = { '1m': 22, '3m': 46, '1y': 60, all: 60 } as const;

  $effect(() => {
    const t = ticker;
    detail = null;
    error = null;
    let cancelled = false;
    fetch(`/api/holdings/${t}/detail`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: Detail) => {
        if (!cancelled) detail = d;
      })
      .catch((e: Error) => {
        if (!cancelled) error = e.message;
      });
    return () => {
      cancelled = true;
    };
  });

  const series = $derived(detail ? detail.priceSeries.slice(-RANGE_POINTS[range]) : []);

  /** The sparkline, drawn into a 408 × 112 box. */
  const points = $derived.by(() => {
    if (series.length < 2) return '';
    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = max - min || 1;
    return series
      .map((v, i) => `${((i / (series.length - 1)) * 408).toFixed(1)},${(112 - ((v - min) / span) * 104).toFixed(1)}`)
      .join(' ');
  });

  const rangeChange = $derived.by(() => {
    if (series.length < 2) return '';
    const chg = ((series[series.length - 1] - series[0]) / series[0]) * 100;
    return `${fmt.caret(chg)} over ${range === 'all' ? 'all time' : range}`;
  });

  const rangeFrom = $derived(
    series.length ? `${fmt.money(series[0])} → ${fmt.money(series[series.length - 1])}` : ''
  );

  const tone = (n: number) => (n > 0 ? 'var(--accent)' : n < 0 ? 'var(--neg)' : 'var(--t1)');

  const summary = $derived.by(() => {
    if (!detail) return [];
    const h = detail.holding;
    return [
      { label: 'Shares', primary: fmt.shares(h.p.shares), secondary: `${h.p.frequency.toLowerCase()} payer`, color: 'var(--t1)' },
      { label: 'Cost basis', primary: fmt.money(h.p.costTotal), secondary: `${fmt.money(h.p.costPerShare)}/sh`, color: 'var(--t1)' },
      { label: 'Value', primary: fmt.money(h.p.value), secondary: `${fmt.pct(h.shareOfPortfolio)} of portfolio`, color: 'var(--t1)' },
      { label: 'Total profit', primary: fmt.signed(h.totalProfit), secondary: fmt.caret(h.totalProfitPct), color: tone(h.totalProfit) },
      { label: 'Dividends', primary: fmt.money(h.p.dividendsReceived), secondary: 'after tax', color: 'var(--t1)' },
      { label: 'IRR', primary: fmt.caret(h.p.irr), secondary: 'annualised', color: tone(h.p.irr) }
    ];
  });
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<!-- scrim -->
<div
  role="button"
  tabindex="-1"
  aria-label="Close"
  onclick={onclose}
  onkeydown={(e) => e.key === 'Enter' && onclose()}
  style="position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.28)"
></div>

<aside
  style="position:fixed;top:0;right:0;bottom:0;z-index:81;width:min(468px,100vw);background:var(--card);border-left:1px solid var(--line);box-shadow:var(--shadow);display:flex;flex-direction:column;overflow-y:auto"
>
  {#if error}
    <div style="padding:20px;display:flex;flex-direction:column;gap:10px">
      <span style="font-size:13px;color:var(--neg)">Could not load {ticker}: {error}</span>
      <button onclick={onclose} style="align-self:flex-start;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--t2);font-size:12px;padding:6px 10px;cursor:pointer">Close</button>
    </div>
  {:else if !detail}
    <div style="padding:20px;font-size:13px;color:var(--t3)">Loading {ticker}…</div>
  {:else}
    {@const h = detail.holding}
    <div style="display:flex;align-items:flex-start;gap:12px;padding:18px 20px;border-bottom:1px solid var(--line)">
      <span class="mono-badge" style="width:36px;height:36px;font-size:12px">{h.p.mono}</span>
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0;flex:1">
        <span style="font-size:15px;font-weight:600;color:var(--t1)">{h.p.name}</span>
        <span style="font-size:12px;color:var(--t3)">{h.p.ticker} · {h.p.assetClass} · {h.p.sector}</span>
      </div>
      <button onclick={onclose} aria-label="Close" class="icon-btn" style="width:28px;height:28px;border:none">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>

    <div style="padding:16px 20px;display:flex;flex-direction:column;gap:14px;border-bottom:1px solid var(--line)">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:baseline;gap:10px">
          <span style="font-size:24px;font-weight:600;letter-spacing:-0.02em;color:var(--t1)"
            >{h.p.price ? fmt.money(h.p.price) : '—'}</span
          >
          <span style="font-size:12px;color:{tone(h.p.dayChangeAbs)}">
            {h.p.dayChangeAbs ? `${fmt.signed(h.p.dayChangeAbs)} ${fmt.caret(h.p.dayChangePct)} today` : 'unchanged today'}
          </span>
        </div>
        <div style="display:flex;padding:2px;border:1px solid var(--line);border-radius:7px;gap:2px">
          {#each ['1m', '3m', '1y', 'all'] as const as r (r)}
            <button
              onclick={() => (range = r)}
              style="height:24px;padding:0 9px;border:none;border-radius:5px;font-size:11px;font-weight:500;cursor:pointer;background:{range === r ? 'var(--accent-soft)' : 'transparent'};color:{range === r ? 'var(--accent)' : 'var(--t2)'}"
              >{r}</button
            >
          {/each}
        </div>
      </div>

      <svg viewBox="0 0 408 118" style="width:100%;height:auto;display:block">
        <polyline
          points={points}
          fill="none"
          stroke={h.capitalGain >= 0 ? 'var(--accent)' : 'var(--neg)'}
          stroke-width="2"
          stroke-linejoin="round"
        />
      </svg>

      <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--t3)">
        <span>{rangeFrom}</span>
        <span>{rangeChange}</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-bottom:1px solid var(--line)">
      {#each summary as s (s.label)}
        <div style="display:flex;flex-direction:column;gap:3px;padding:13px 16px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)">
          <span style="font-size:11px;color:var(--t3)">{s.label}</span>
          <span style="font-size:15px;font-weight:600;color:{s.color}">{s.primary}</span>
          <span style="font-size:11px;color:var(--t3)">{s.secondary}</span>
        </div>
      {/each}
    </div>

    {#if h.p.caveat}
      <div style="margin:16px 20px 0;padding:11px 13px;border:1px solid var(--line);border-left:2px solid var(--amber);border-radius:6px;font-size:12px;color:var(--t2);line-height:1.5">
        {h.p.caveat}
      </div>
    {/if}

    {#if detail.corporateActions.length}
      <div style="padding:16px 20px 0;display:flex;flex-direction:column;gap:9px">
        <span style="font-size:12px;font-weight:600;color:var(--t1)">Corporate actions</span>
        {#each detail.corporateActions as e (e.id)}
          <div style="display:flex;flex-direction:column;gap:2px;border-left:2px solid var(--line);padding-left:10px">
            <span style="font-size:12px;color:var(--t1)">{e.type} · {e.date}</span>
            <span style="font-size:11px;color:var(--t3);line-height:1.45">{e.headline}</span>
          </div>
        {/each}
      </div>
    {/if}

    <div style="padding:16px 20px;display:flex;flex-direction:column;gap:9px">
      <span style="font-size:12px;font-weight:600;color:var(--t1)">Transactions</span>
      {#each detail.transactions as tx (tx.date + tx.type + tx.total)}
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--line)">
          <span style="display:flex;flex-direction:column;gap:1px;min-width:0">
            <span style="font-size:12px;font-weight:500;color:{tx.type === 'Sell' ? 'var(--neg)' : 'var(--accent)'}">{tx.type}</span>
            <span style="font-size:11px;color:var(--t3)">{tx.date} · {fmt.shares(tx.shares)} sh @ {fmt.money(tx.price)}</span>
          </span>
          <span style="font-size:12px;font-weight:500;color:var(--t1);white-space:nowrap">{fmt.money(tx.total)}</span>
        </div>
      {/each}
    </div>

    <div style="padding:0 20px 16px;display:flex;flex-direction:column;gap:9px">
      <span style="font-size:12px;font-weight:600;color:var(--t1)">Recent payments</span>
      {#if detail.dividends.length}
        {#each detail.dividends as d (d.payDate)}
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--line)">
            <span style="display:flex;flex-direction:column;gap:1px">
              <span style="font-size:12px;color:var(--t1)">{d.payDate}</span>
              <span style="font-size:11px;color:var(--t3)">{fmt.money(d.perShare)}/sh gross</span>
            </span>
            <span style="font-size:12px;font-weight:500;color:var(--t1)">{fmt.money(d.net)}</span>
          </div>
        {/each}
        <span style="font-size:11px;color:var(--t3)">{fmt.money(h.p.dividendsReceived)} received to date</span>
      {:else}
        <span style="font-size:12px;color:var(--t3)">This holding pays no dividend.</span>
      {/if}
    </div>

    <div style="padding:0 20px 20px;display:flex;flex-direction:column;gap:7px">
      <span style="font-size:12px;font-weight:600;color:var(--t1)">Note</span>
      <textarea
        bind:value={note}
        placeholder="Why you hold this…"
        rows="3"
        style="width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:6px;background:var(--canvas);color:var(--t1);font-size:12px;line-height:1.5;outline:none;resize:vertical"
      ></textarea>
      <span style="font-size:11px;color:var(--t3)">Notes are not saved yet — there is no store for them.</span>
    </div>
  {/if}
</aside>
