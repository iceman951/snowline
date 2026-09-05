<!--
  Dividends received — the actual payment history, after withholding.
  Period and granularity are the user's; the axis step adapts to the series so
  a yearly view is not squashed against a monthly scale.
-->
<script lang="ts">
  import { MONTH_FULL, fmt, type ScheduleRow, type TimelinePoint } from '@snowline/core';
  import { bars, gridFor, tipLeft, type TooltipData } from '$lib/charts';
  import ChartTooltip from '../ChartTooltip.svelte';
  import Metric from '../Metric.svelte';

  let {
    timeline,
    scheduleFor
  }: {
    timeline: TimelinePoint[];
    /** Gross payers for a month, used to break a monthly bar down by ticker. */
    scheduleFor: (month: string) => ScheduleRow[];
  } = $props();

  type Period = '12 trailing months' | '2026' | '2025' | 'All time';
  type Gran = 'Monthly' | 'Quarterly' | 'Yearly';

  let period = $state<Period>('12 trailing months');
  let gran = $state<Gran>('Monthly');
  let chart = $state<'bars' | 'line'>('bars');
  let menu = $state<'period' | 'gran' | null>(null);
  let hover = $state<number | null>(null);

  interface Point {
    label: string;
    year: string;
    v: number;
    parts?: TimelinePoint[];
  }

  const series = $derived.by((): Point[] => {
    let pts: TimelinePoint[] = timeline;
    if (period === '12 trailing months') pts = pts.slice(-12);
    else if (period === '2026' || period === '2025') pts = pts.filter((x) => x.year === period);

    if (gran === 'Quarterly') {
      const out: Point[] = [];
      for (let i = 0; i < pts.length; i += 3) {
        const chunk = pts.slice(i, i + 3);
        out.push({
          label: `${chunk[0].label}–${chunk[chunk.length - 1].label}`,
          year: chunk[chunk.length - 1].year,
          v: chunk.reduce((s, c) => s + c.v, 0),
          parts: chunk
        });
      }
      return out;
    }

    if (gran === 'Yearly') {
      const map = new Map<string, Point>();
      pts.forEach((x) => {
        const row = map.get(x.year) ?? { label: x.year, year: x.year, v: 0, parts: [] };
        row.v += x.v;
        row.parts!.push(x);
        map.set(x.year, row);
      });
      return [...map.keys()].sort().map((k) => map.get(k)!);
    }

    return pts.map((p) => ({ ...p }));
  });

  const total = $derived(series.reduce((s, x) => s + x.v, 0));

  const step = $derived.by(() => {
    const max = Math.max(...series.map((x) => x.v));
    return max > 900 ? 500 : max > 400 ? 250 : max > 220 ? 100 : 50;
  });
  const axisMax = $derived(Math.ceil(Math.max(...series.map((x) => x.v)) / step) * step);
  const barWidth = $derived(series.length > 8 ? 22 : series.length > 4 ? 40 : 72);

  const grid = $derived(gridFor(axisMax, axisMax / step > 4 ? 4 : axisMax / step));

  const barData = $derived.by(() =>
    bars(
      series.map((x) => x.v),
      series.length,
      axisMax,
      barWidth
    ).map((b, i) => ({
      ...b,
      label: series[i].label,
      dx: (parseFloat(b.cx) - 3).toFixed(1),
      dy: (parseFloat(b.y) - 3).toFixed(1)
    }))
  );

  const linePoints = $derived(barData.map((b) => `${b.cx},${b.y}`).join(' '));

  const tip = $derived.by((): TooltipData | null => {
    if (hover === null) return null;
    const pt = series[hover];
    if (!pt) return null;

    const isMonth = gran === 'Monthly';
    let rows;
    if (isMonth) {
      // Split the month's actual receipt across the tickers that pay it, in
      // proportion to their scheduled amounts.
      const sc = scheduleFor(pt.label);
      const raw = sc.reduce((s, r) => s + r.amt, 0) || 1;
      rows = sc.map((r) => ({
        label: r.t,
        value: fmt.money((r.amt / raw) * pt.v),
        color: 'var(--accent)'
      }));
    } else {
      rows = (pt.parts ?? []).map((p) => ({
        label: `${p.label} ${p.year}`,
        value: fmt.money(p.v),
        color: 'var(--accent)'
      }));
    }

    return {
      title: (isMonth
        ? `${MONTH_FULL[pt.label]} ${pt.year}`
        : `${pt.label} ${gran === 'Yearly' ? '' : pt.year}`
      ).trim(),
      headline: fmt.money(pt.v),
      sub: 'after 15% withholding tax',
      rows
    };
  });

  const PERIODS: Period[] = ['12 trailing months', '2026', '2025', 'All time'];
  const GRANS: Gran[] = ['Monthly', 'Quarterly', 'Yearly'];

  const unit = $derived(gran === 'Monthly' ? 'months' : gran === 'Quarterly' ? 'quarters' : 'years');
</script>

<svelte:window onclick={() => (menu = null)} />

<div class="card">
  <div class="card-head">
    <span class="card-title">Dividends received</span>
    <button
      onclick={(e) => {
        e.stopPropagation();
        chart = chart === 'bars' ? 'line' : 'bars';
      }}
      title="Change chart type"
      class="icon-btn"
      style="width:28px;height:28px"
    >
      {#if chart === 'bars'}
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"><path d="M5 20V11M12 20V5M19 20v-6" /></svg
        >
      {:else}
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"><path d="M4 16l5-6 4 3 7-9" /></svg
        >
      {/if}
    </button>
  </div>

  <div style="padding:16px 20px 20px;display:flex;flex-direction:column;gap:18px">
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap">
      <div style="display:flex;gap:9px">
        <span style="width:3px;flex:none;border-radius:1px;background:var(--accent)"></span>
        <Metric
          size="mini"
          label="Total"
          help={false}
          primary={fmt.money(total)}
          secondary={`${series.length} ${unit} · after tax`}
        />
      </div>

      <div style="display:flex;align-items:center;gap:8px">
        {#each [{ key: 'period' as const, value: period, options: PERIODS, width: 196 }, { key: 'gran' as const, value: gran, options: GRANS, width: 160 }] as ctl (ctl.key)}
          <div style="position:relative">
            <button
              onclick={(e) => {
                e.stopPropagation();
                menu = menu === ctl.key ? null : ctl.key;
              }}
              style="display:flex;align-items:center;gap:7px;height:30px;padding:0 10px;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--t1);font-size:12px;cursor:pointer"
              >{ctl.value}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--t3)"
                stroke-width="2.2"
                stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg
              >
            </button>
            {#if menu === ctl.key}
              <div
                role="menu"
                tabindex="-1"
                onclick={(e) => e.stopPropagation()}
                onkeydown={() => {}}
                style="position:absolute;top:36px;right:0;z-index:55;width:{ctl.width}px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px;animation:menuIn .12s ease-out"
              >
                {#each ctl.options as o (o)}
                  <button
                    onclick={() => {
                      if (ctl.key === 'period') period = o as Period;
                      else gran = o as Gran;
                      menu = null;
                      hover = null;
                    }}
                    style="display:flex;align-items:center;justify-content:space-between;width:100%;height:40px;padding:0 10px;border:none;border-radius:6px;background:transparent;color:var(--t1);font-size:13px;cursor:pointer;text-align:left"
                  >
                    <span>{o}</span>
                    <span style="color:var(--accent);font-size:12px;opacity:{o === ctl.value ? 1 : 0}"
                      >✓</span
                    >
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

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
          {#if chart === 'line'}
            <polyline
              points={linePoints}
              fill="none"
              stroke="var(--accent)"
              stroke-width="2"
              stroke-linejoin="round"
              pointer-events="none"
            />
          {/if}
          {#each barData as b (b.i)}
            <rect
              x={b.sx}
              y="12"
              width={b.sw}
              height="136"
              fill="var(--hover)"
              opacity={hover === b.i ? 1 : 0}
              onmouseenter={() => (hover = b.i)}
              onmouseleave={() => (hover = null)}
              role="presentation"
            />
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              fill="var(--accent)"
              opacity={chart === 'bars' ? 1 : 0}
              pointer-events="none"
            />
            <rect
              x={b.dx}
              y={b.dy}
              width="6"
              height="6"
              fill="var(--accent)"
              opacity={chart === 'line' ? 1 : 0}
              pointer-events="none"
            />
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
        {#each barData as b (b.i)}
          <span
            style="flex:1;text-align:center;font-size:10px;color:var(--t3);white-space:nowrap;overflow:hidden"
            >{b.label}</span
          >
        {/each}
      </div>

      {#if tip && hover !== null}
        <div
          style="position:absolute;top:0;left:{tipLeft(
            barData[hover].cx
          )};transform:translateX(-50%);z-index:8;pointer-events:none"
        >
          <ChartTooltip {tip} />
        </div>
      {/if}
    </div>
  </div>
</div>
