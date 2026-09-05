<!--
  KpiRow — port of the bundle's KpiRow.dc.html.

  The same four headline metrics the Dashboard shows, in the shared form the
  Analytics screens mount. It differs from the Dashboard's own KPI row in its
  footnotes: shares and holdings rather than a goal link, and dividends
  received rather than lifetime.
-->
<script lang="ts">
  import { fmt, type Constants, type Totals } from '@snowline/core';
  import Metric from './Metric.svelte';

  let { totals: T, constants: K }: { totals: Totals; constants: Constants } = $props();

  let mask = $state(false);
</script>

<div data-r="kpi" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px">
  <div class="card" style="position:relative;padding:var(--pad)">
    <Metric
      label="Value"
      tip="Market value of all holdings plus cash, in your base currency."
      primary={fmt.money(T.value)}
      secondary={fmt.money(T.invested)}
      secondaryNote="invested"
      masked={mask}
    />
    <button
      onclick={() => (mask = !mask)}
      title={mask ? 'Show amounts' : 'Hide amounts'}
      style="position:absolute;top:14px;right:14px;display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;border-radius:6px;background:transparent;color:var(--t3);cursor:pointer"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <path d="M2.5 12S6.2 6.2 12 6.2 21.5 12 21.5 12 17.8 17.8 12 17.8 2.5 12 2.5 12z" />
        <circle cx="12" cy="12" r="2.6" />
        <path d="M4 4l16 16" opacity={mask ? 1 : 0} />
      </svg>
    </button>
    <div style="margin-top:14px;display:flex;align-items:center;gap:8px;font-size:11px;color:var(--t3)">
      <span>{fmt.shares(T.shares)} shares</span>
      <span style="width:1px;height:10px;background:var(--line)"></span>
      <span>{T.holdings} holdings</span>
    </div>
  </div>

  <div class="card" style="padding:var(--pad)">
    <Metric
      label="Total profit"
      tip="Capital gain plus dividends received and realised P&L, net of fees and taxes."
      primary={fmt.signed(T.totalProfit)}
      primaryTone="pos"
      primaryDelta={fmt.caret(T.totalProfitPct)}
      secondary={`${fmt.signed(T.dayChange)} ${fmt.caret(T.dayChangePct)}`}
      secondaryTone="neg"
      secondaryNote="daily"
      masked={mask}
    />
    <div style="margin-top:14px;display:flex;align-items:center;gap:8px;font-size:11px;color:var(--t3)">
      <span>Capital gain {fmt.signed(T.capitalGain)}</span>
      <span style="width:1px;height:10px;background:var(--line)"></span>
      <span>Dividends {fmt.money(T.dividendsReceived)}</span>
    </div>
  </div>

  <div class="card" style="padding:var(--pad)">
    <Metric
      label="IRR"
      tip="Money-weighted annualised return. Accounts for the timing and size of every deposit."
      dotted
      primary={fmt.pct(K.irrAllTime)}
      primaryTone="pos"
      secondary={fmt.pct(K.irrCurrentHoldings)}
      secondaryNote="current holdings"
    />
    <div style="margin-top:14px;display:flex;align-items:center;gap:8px;font-size:11px;color:var(--t3)">
      <span>TWR {fmt.pct(K.twr)}</span>
      <span style="width:1px;height:10px;background:var(--line)"></span>
      <span>{K.benchmark} {fmt.pct(K.benchmarkTwr)}</span>
    </div>
  </div>

  <div class="card" style="padding:var(--pad)">
    <Metric
      label="Passive income"
      tip="Forward 12-month dividend income at current yields, before withholding tax."
      primary={fmt.pct(T.grossYield)}
      primaryDelta={fmt.caret(K.incomeGrowthYoY, 1)}
      deltaTone="pos"
      secondary={fmt.money(T.forwardGross)}
      secondaryNote="annually, gross"
      masked={mask}
    />
    <div style="margin-top:14px;display:flex;align-items:center;gap:8px;font-size:11px;color:var(--t3)">
      <span>{fmt.money(T.forwardGross / 12)} monthly</span>
      <span style="width:1px;height:10px;background:var(--line)"></span>
      <span>{fmt.money(T.forwardNet)} net of tax</span>
    </div>
  </div>
</div>
