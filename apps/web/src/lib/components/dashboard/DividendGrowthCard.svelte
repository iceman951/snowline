<!--
  Dividend growth — the same calendar month across three years, side by side,
  so seasonality does not read as growth.
-->
<script lang="ts">
  import { MONTHS, MONTH_FULL, fmt, type DividendHistory } from '@snowline/core';
  import { PLOT, gridFor, tipLeft, type TooltipData } from '$lib/charts';
  import ChartTooltip from '../ChartTooltip.svelte';

  let { history }: { history: DividendHistory } = $props();

  /** Fixed axis, as in the design — the series is stable enough to pin. */
  const MAX = 175;
  const YEARS = ['2024', '2025', '2026'] as const;
  const TINTS = ['var(--accent-4)', 'var(--accent-3)', 'var(--accent)'];

  let hover = $state<number | null>(null);

  const grid = gridFor(MAX, 3);
  const slot = (PLOT.right - PLOT.left) / 12;

  const at = (year: string, i: number): number | undefined => history[Number(year)]?.[i];

  const groups = $derived.by(() =>
    MONTHS.map((mo, i) => {
      const sx = PLOT.left + i * slot;
      return {
        i,
        label: mo,
        sx: sx.toFixed(1),
        sw: slot.toFixed(1),
        cx: (sx + slot / 2).toFixed(1),
        bars: YEARS.map((y, j) => {
          const v = at(y, i) ?? 0;
          const h = (v / MAX) * (PLOT.base - PLOT.top);
          return {
            year: y,
            x: (sx + (slot - 37) / 2 + j * 13).toFixed(1),
            y: (PLOT.base - h).toFixed(1),
            h: h.toFixed(1),
            fill: TINTS[j]
          };
        })
      };
    })
  );

  const tip = $derived.by((): TooltipData | null => {
    if (hover === null) return null;
    const i = hover;
    const v26 = at('2026', i);
    const v25 = at('2025', i) ?? 0;
    return {
      title: MONTH_FULL[MONTHS[i]],
      headline: v26 === undefined ? `${fmt.money(v25)} in 2025` : fmt.money(v26),
      rows: YEARS.map((y, j) => ({
        label: y,
        value: at(y, i) === undefined ? '—' : fmt.money(at(y, i)!),
        color: TINTS[j]
      })),
      footer:
        v26 === undefined
          ? 'No 2026 payment yet'
          : v25 > 0
            ? `${fmt.caret(((v26 - v25) / v25) * 100, 1)} vs 2025`
            : 'first year of payments',
      footerTone: v26 !== undefined && v26 >= v25 ? 'pos' : 'neg'
    };
  });

  const yearTotal = (y: string) => (history[Number(y)] ?? []).reduce((s, v) => s + v, 0);
</script>

<div class="card">
  <div class="card-head">
    <span class="card-title">Dividend growth</span>
    <span class="card-note">same month, year over year</span>
  </div>

  <div style="padding:18px 20px 20px;display:flex;flex-direction:column;gap:14px">
    <div style="position:relative">
      <div style="position:relative">
        <svg viewBox="0 0 624 154" style="width:100%;height:auto;display:block">
          {#each grid as g (g.y)}
            <line
              x1="34"
              y1={g.y}
              x2="616"
              y2={g.y}
              stroke="var(--line)"
              stroke-width="1"
              stroke-dasharray="3 4"
            />
          {/each}
          {#each groups as g (g.i)}
            <rect
              x={g.sx}
              y="12"
              width={g.sw}
              height="136"
              fill="var(--hover)"
              opacity={hover === g.i ? 1 : 0}
              onmouseenter={() => (hover = g.i)}
              onmouseleave={() => (hover = null)}
              role="presentation"
            />
            {#each g.bars as b (b.year)}
              <rect x={b.x} y={b.y} width="11" height={b.h} fill={b.fill} pointer-events="none" />
            {/each}
          {/each}
        </svg>
        {#each grid as g (g.y)}
          <span
            style="position:absolute;left:0;top:{g.top};width:4.4%;transform:translateY(-50%);text-align:right;font-size:10px;color:var(--t3);pointer-events:none"
            >{g.label}</span
          >
        {/each}
      </div>

      <div style="display:flex;margin:4px 1.28% 0 5.45%">
        {#each groups as g (g.i)}
          <span style="flex:1;text-align:center;font-size:10px;color:var(--t3)">{g.label}</span>
        {/each}
      </div>

      {#if tip && hover !== null}
        <div
          style="position:absolute;top:0;left:{tipLeft(
            groups[hover].cx
          )};transform:translateX(-50%);z-index:8;pointer-events:none"
        >
          <ChartTooltip {tip} />
        </div>
      {/if}
    </div>

    <div style="display:flex;align-items:center;flex-wrap:wrap;gap:18px;padding-left:34px">
      {#each YEARS as y, j (y)}
        <span style="display:flex;align-items:center;gap:7px">
          <span style="width:9px;height:9px;border-radius:1px;background:{TINTS[j]};display:inline-block"
          ></span>
          <span style="font-size:12px;color:var(--t2)">{y}</span>
          <span style="font-size:12px;color:var(--t3)"
            >{fmt.money(yearTotal(y))}{y === '2026' ? ' YTD' : ''}</span
          >
        </span>
      {/each}
    </div>
  </div>
</div>
