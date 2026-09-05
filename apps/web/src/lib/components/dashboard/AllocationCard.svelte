<!--
  Allocation — donut of current weights with a dashed target ring, beside a
  sortable table of the same categories. Hovering either side highlights both.
-->
<script lang="ts">
  import { fmt, type Category, type Totals } from '@snowline/core';
  import { arcPath, ramp } from '$lib/charts';
  import TwoLineCell from '../TwoLineCell.svelte';

  let { categories, totals }: { categories: Category[]; totals: Totals } = $props();

  type SortKey = 'name' | 'value' | 'gain' | 'alloc';

  let sortKey = $state<SortKey>('value');
  let sortDir = $state<'asc' | 'desc'>('desc');
  let seg = $state<string | null>(null);

  /** Colour is assigned in the categories' own (value-descending) order. */
  const coloured = $derived.by(() => {
    const colours = ramp(categories.length);
    return categories.map((c, i) => ({ ...c, color: colours[i] }));
  });

  const sorted = $derived.by(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return coloured.slice().sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortKey === 'gain') return (a.gainAbs - b.gainAbs) * dir;
      if (sortKey === 'alloc') return (a.allocN - b.allocN) * dir;
      return (a.value - b.value) * dir;
    });
  });

  function setSort(k: SortKey) {
    if (sortKey === k) sortDir = sortDir === 'desc' ? 'asc' : 'desc';
    else {
      sortKey = k;
      sortDir = k === 'name' ? 'asc' : 'desc';
    }
  }

  const arrow = (k: SortKey) => (sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '');

  const C = 2 * Math.PI * 100;

  /** Current weights as a stacked ring, largest first. */
  const donutSegs = $derived.by(() => {
    let acc = 0;
    return coloured
      .slice()
      .sort((a, b) => b.value - a.value)
      .map((r) => {
        const len = (r.allocN / 100) * C;
        const s = {
          name: r.name,
          color: r.color,
          dash: `${Math.max(0, len - 3).toFixed(2)} ${(C - Math.max(0, len - 3)).toFixed(2)}`,
          offset: (-acc).toFixed(2)
        };
        acc += len;
        return s;
      });
  });

  /** The target plan as a dashed outer ring. */
  const donutTargets = $derived.by(() => {
    let tacc = -Math.PI / 2;
    return coloured
      .slice()
      .sort((a, b) => b.value - a.value)
      .map((r) => {
        const a0 = tacc;
        const a1 = tacc + (r.targetN / 100) * 2 * Math.PI - 0.035;
        tacc += (r.targetN / 100) * 2 * Math.PI;
        return { name: r.name, d: arcPath(150, 150, 124, a0, a1), color: r.color };
      });
  });

  const segRow = $derived(coloured.find((r) => r.name === seg));

  const headers: Array<{ key: SortKey; label: string; tip: string }> = [
    {
      key: 'value',
      label: 'Value / Invested',
      tip: 'Market value today over the amount invested, excluding dividends received.'
    },
    {
      key: 'gain',
      label: 'Gain',
      tip: 'Unrealised capital gain only. Dividends received are counted in total profit.'
    },
    {
      key: 'alloc',
      label: 'Allocation',
      tip: 'Current share of portfolio value over the target you set for this category.'
    }
  ];

  let hdr = $state<SortKey | null>(null);

  const GRID = 'minmax(0,2fr) minmax(0,1.15fr) minmax(0,1.05fr) minmax(0,1.05fr)';
</script>

<div class="card">
  <div class="card-head">
    <div style="display:flex;align-items:center;gap:10px">
      <span class="card-title">Allocation</span>
      <span class="card-note">by category · target vs current</span>
    </div>
    <a href="/portfolio/categories" style="font-size:12px;font-weight:500">Categories →</a>
  </div>

  <div
    data-r="alloc"
    style="display:grid;grid-template-columns:340px minmax(0,1fr);gap:28px;padding:20px"
  >
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
      <div style="position:relative;width:100%;max-width:300px">
        <svg viewBox="0 0 300 300" style="width:100%;height:auto;display:block">
          <circle cx="150" cy="150" r="100" fill="none" stroke="var(--line)" stroke-width="24" />
          {#each donutSegs as s (s.name)}
            <circle
              cx="150"
              cy="150"
              r="100"
              fill="none"
              stroke={s.color}
              stroke-width={seg === s.name ? 28 : 24}
              stroke-dasharray={s.dash}
              stroke-dashoffset={s.offset}
              opacity={seg === null || seg === s.name ? 1 : 0.32}
              transform="rotate(-90 150 150)"
              onmouseenter={() => (seg = s.name)}
              onmouseleave={() => (seg = null)}
              role="presentation"
              style="cursor:default;transition:opacity .15s ease,stroke-width .15s ease"
            />
          {/each}
          {#each donutTargets as t (t.name)}
            <path
              d={t.d}
              fill="none"
              stroke={t.color}
              stroke-width="2"
              stroke-dasharray="2 3.5"
              opacity={seg === null || seg === t.name ? 0.85 : 0.2}
            />
          {/each}
        </svg>
        <div
          style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;pointer-events:none"
        >
          <span style="font-size:19px;font-weight:600;letter-spacing:-0.02em;color:var(--t1)"
            >{fmt.money(segRow ? segRow.value : totals.value)}</span
          >
          <span style="font-size:11px;color:var(--t2);text-align:center;max-width:160px;line-height:1.3"
            >{segRow ? segRow.name : 'Portfolio value'}</span
          >
          <span style="font-size:11px;color:var(--t3)"
            >{segRow
              ? `${fmt.num(segRow.allocN, 1)}% · ${fmt.num(segRow.targetN, 1)}% target`
              : `${totals.categoryCount} categories · ${totals.holdings} holdings`}</span
          >
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:14px;font-size:11px;color:var(--t3)">
        <span style="display:flex;align-items:center;gap:5px"
          ><span style="width:12px;height:3px;background:var(--accent);display:inline-block"></span
          >Current</span
        >
        <span style="display:flex;align-items:center;gap:5px"
          ><span style="width:12px;height:2px;background:var(--t3);display:inline-block;opacity:.6"
          ></span>Target (dashed)</span
        >
      </div>
    </div>

    <div style="display:flex;flex-direction:column;min-width:0">
      <div
        style="display:grid;grid-template-columns:{GRID};gap:12px;padding:0 0 9px 0;border-bottom:1px solid var(--line)"
      >
        <button
          onclick={() => setSort('name')}
          style="display:flex;align-items:center;gap:4px;border:none;background:transparent;padding:0;cursor:pointer;font-size:12px;font-weight:500;color:var(--t2);text-align:left"
          >Name<span style="color:var(--accent);font-size:9px">{arrow('name')}</span></button
        >
        {#each headers as h (h.key)}
          <div style="position:relative;display:flex;justify-content:flex-end">
            <button
              onclick={() => setSort(h.key)}
              onmouseenter={() => (hdr = h.key)}
              onmouseleave={() => (hdr = null)}
              style="display:flex;align-items:center;gap:4px;border:none;background:transparent;padding:0;cursor:pointer;font-size:12px;font-weight:500;color:var(--t2);border-bottom:1px dotted var(--t3)"
              >{h.label}<span style="color:var(--accent);font-size:9px">{arrow(h.key)}</span></button
            >
            {#if hdr === h.key}
              <span
                style="position:absolute;top:22px;right:0;z-index:20;width:210px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:9px 11px;font-size:11px;line-height:1.5;color:var(--t2);pointer-events:none"
                >{h.tip}</span
              >
            {/if}
          </div>
        {/each}
      </div>

      {#each sorted as row (row.name)}
        <div
          role="row"
          tabindex="-1"
          onmouseenter={() => (seg = row.name)}
          onmouseleave={() => (seg = null)}
          style="display:grid;grid-template-columns:{GRID};gap:12px;align-items:center;padding:11px 6px 11px 0;border-bottom:1px solid var(--line);background:{seg ===
          row.name
            ? 'var(--hover)'
            : 'transparent'};transition:background .12s ease"
        >
          <div style="display:flex;align-items:center;gap:11px;min-width:0">
            <span style="width:3px;height:30px;flex:none;border-radius:1px;background:{row.color}"
            ></span>
            <span style="display:flex;flex-direction:column;gap:2px;min-width:0">
              <span
                style="font-size:13px;font-weight:500;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
                >{row.name}</span
              >
              <span style="font-size:12px;color:var(--t3)"
                >{row.count} {row.count === 1 ? 'item' : 'items'}</span
              >
            </span>
          </div>
          <TwoLineCell
            align="right"
            primary={fmt.money(row.value)}
            secondary={`${fmt.money(row.invested)} invested`}
          />
          <TwoLineCell
            align="right"
            primary={fmt.signed(row.gainAbs)}
            secondary={fmt.caret(row.gainPctN)}
            tone={row.gainAbs >= 0 ? 'pos' : 'neg'}
            secondaryTone={row.gainAbs >= 0 ? 'pos' : 'neg'}
          />
          <TwoLineCell
            align="right"
            primary={`${fmt.num(row.allocN, 1)}%`}
            secondary={`${fmt.num(row.targetN, 1)}% target`}
          />
        </div>
      {/each}

      <div
        style="display:grid;grid-template-columns:{GRID};gap:12px;align-items:center;padding:12px 6px 0 0"
      >
        <span style="font-size:12px;font-weight:500;color:var(--t2);padding-left:14px">Total</span>
        <TwoLineCell
          align="right"
          primary={fmt.money(totals.value)}
          secondary={fmt.money(totals.invested)}
        />
        <TwoLineCell
          align="right"
          primary={fmt.signed(totals.capitalGain)}
          secondary={fmt.caret(totals.capitalGainPct)}
          tone={totals.capitalGain >= 0 ? 'pos' : 'neg'}
          secondaryTone={totals.capitalGain >= 0 ? 'pos' : 'neg'}
        />
        <TwoLineCell align="right" primary="100.0%" secondary="100.0% target" />
      </div>
    </div>
  </div>
</div>
