<!--
  Future payments — the forward 12 months. Each bar stacks what has already
  been received inside the month's projected total.
-->
<script lang="ts">
  import { fmt, type ForwardMonth, type Totals } from '@snowline/core';
  import { PLOT, bars, gridFor, tipLeft, type TooltipData } from '$lib/charts';
  import ChartTooltip from '../ChartTooltip.svelte';
  import Metric from '../Metric.svelte';

  let {
    forwardPayments,
    paymentCount,
    totals
  }: { forwardPayments: ForwardMonth[]; paymentCount: number; totals: Totals } = $props();

  /** Fixed axis: the design pins this chart at $200 so months stay comparable. */
  const MAX = 200;

  let hover = $state<number | null>(null);

  const grid = gridFor(MAX, 4);

  const barData = $derived.by(() =>
    bars(
      forwardPayments.map((m) => m.total),
      12,
      MAX,
      22
    ).map((b, i) => {
      const rh = (forwardPayments[i].received / MAX) * (PLOT.base - PLOT.top);
      return {
        ...b,
        ry: (PLOT.base - rh).toFixed(1),
        rh: rh.toFixed(1),
        label: forwardPayments[i].label,
        labelColor: i === 0 ? 'var(--t2)' : 'var(--t3)'
      };
    })
  );

  const dotColor = (s: string) =>
    s === 'Paid' ? 'var(--accent)' : s === 'Declared' ? 'var(--accent-3)' : 'var(--accent-4)';

  const tip = $derived.by((): TooltipData | null => {
    if (hover === null) return null;
    const mo = forwardPayments[hover];
    if (!mo) return null;
    return {
      title: mo.full,
      headline: fmt.money(mo.total),
      sub:
        mo.received > 0
          ? `${fmt.money(mo.received)} received · ${fmt.money(mo.total - mo.received)} projected`
          : `${mo.rows.length} payments projected`,
      rows: mo.rows.map((r) => ({ label: r.t, value: fmt.money(r.amt), color: dotColor(r.status) }))
    };
  });
</script>

<div class="card">
  <div class="card-head">
    <span class="card-title">Future payments</span>
    <a href="/portfolio/dividend-calendar" style="font-size:12px;font-weight:500">Calendar →</a>
  </div>

  <div style="padding:16px 20px 20px;display:flex;flex-direction:column;gap:18px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div style="display:flex;gap:26px">
        <div style="display:flex;gap:9px">
          <span style="width:3px;flex:none;border-radius:1px;background:var(--accent)"></span>
          <Metric
            size="mini"
            label="Next 12m"
            help={false}
            primary={fmt.money(totals.forwardGross)}
            secondary={`${paymentCount} payments`}
          />
        </div>
        <div style="display:flex;gap:9px">
          <span style="width:3px;flex:none;border-radius:1px;background:var(--accent-3)"></span>
          <Metric
            size="mini"
            label="Monthly"
            help={false}
            primary={fmt.money(totals.forwardGross / 12)}
            secondary="average, gross"
          />
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:14px;font-size:11px;color:var(--t3);padding-top:4px">
        <span style="display:flex;align-items:center;gap:5px"
          ><span
            style="width:8px;height:8px;background:var(--accent);display:inline-block;border-radius:1px"
          ></span>Received</span
        >
        <span style="display:flex;align-items:center;gap:5px"
          ><span
            style="width:8px;height:8px;background:var(--accent-3);display:inline-block;border-radius:1px"
          ></span>Projected</span
        >
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
            <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="var(--accent-3)" pointer-events="none" />
            <rect x={b.x} y={b.ry} width={b.w} height={b.rh} fill="var(--accent)" pointer-events="none" />
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
          <span style="flex:1;text-align:center;font-size:10px;color:{b.labelColor}">{b.label}</span>
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
