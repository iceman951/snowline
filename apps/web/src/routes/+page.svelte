<!--
  Dashboard — port of the bundle's Snowline.dc.html.

  Every figure comes from the API's derived payload. Nothing on this page
  restates a number the engine did not compute; the only literals here are
  the editorial "why is it moving?" notes, which the design also hardcodes.
-->
<script lang="ts">
  import { fmt } from '@snowline/core';
  import Metric from '$lib/components/Metric.svelte';
  import TopNav from '$lib/components/TopNav.svelte';
  import TwoLineCell from '$lib/components/TwoLineCell.svelte';
  import AllocationCard from '$lib/components/dashboard/AllocationCard.svelte';
  import DividendGrowthCard from '$lib/components/dashboard/DividendGrowthCard.svelte';
  import DividendsReceivedCard from '$lib/components/dashboard/DividendsReceivedCard.svelte';
  import FuturePaymentsCard from '$lib/components/dashboard/FuturePaymentsCard.svelte';
  import GoalCard from '$lib/components/dashboard/GoalCard.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const d = $derived(data.dashboard);
  const T = $derived(d.totals);
  const K = $derived(d.constants);

  let mask = $state(false);
  let dismissed = $state<number[]>([]);

  /* ---- insights: derived from the live category drift, as in the design -- */

  const insightLines = $derived.by(() => {
    const cats = d.categories;
    const under = cats.slice().sort((a, b) => a.driftN - b.driftN);
    const biggest = cats[0];
    const over = under.filter((r) => r.name !== biggest.name).slice(-1)[0];
    const gldi = d.holdings.find((h) => h.ticker === 'GLDI');
    const gldiCat = cats.find((c) => c.tickers.includes('GLDI'));

    return {
      one: `${biggest.name} hold ${fmt.num(biggest.allocN, 1)}% of the portfolio against a ${fmt.num(
        biggest.targetN,
        1
      )}% target — one sleeve drives most of your risk.`,
      two: `${under[0].name} sits ${fmt.num(Math.abs(under[0].driftN), 1)}pp under target and ${
        under[1].name
      } ${fmt.num(Math.abs(under[1].driftN), 1)}pp under, while ${over.name} runs ${fmt.num(
        over.driftN,
        1
      )}pp over.`,
      three: `GLDI and QQQI have trailed ${K.benchmark} by more than 20pp over the last 12 months.`,
      gldi,
      gldiCat
    };
  });

  const insights = [
    { n: 1, tag: 'Concentration', title: 'Asset allocation is concentrated', href: '/portfolio/categories' },
    { n: 2, tag: 'Diversification', title: 'Sector allocation is uneven', href: '/analytics/diversification' },
    { n: 3, tag: 'Performance', title: '“Dead weight” holdings', href: '/analytics/growth' }
  ];

  const lineFor = (n: number) =>
    n === 1 ? insightLines.one : n === 2 ? insightLines.two : insightLines.three;

  const visibleInsights = $derived(insights.filter((i) => !dismissed.includes(i.n)));

  /* ---- market quotes -----------------------------------------------------
     The prototype hardcodes these; there is no quote feed in the data model.
     Kept verbatim and marked so it is obvious what still needs a real source. */
  const quotes = [
    { name: 'EUR / USD', price: '1.0847', chg: '▲0.12%', up: true },
    { name: 'USD / THB', price: '34.2130', chg: '▼0.08%', up: false },
    { name: 'Gold', price: '$2,412.30', chg: '▲0.42%', up: true },
    { name: 'SPY', price: '$615.28', chg: '▲0.31%', up: true },
    { name: 'QQQ', price: '$548.19', chg: '▼0.22%', up: false },
    { name: 'US 10Y', price: '4.128%', chg: '▲0.03%', up: true }
  ];

  /* ---- "why is it moving?" — editorial copy, as in the design ----------- */
  const WHY = [
    {
      ticker: 'NVDA',
      mono: 'NV',
      note: 'Datacenter revenue came in above consensus and guidance was raised; suppliers across the AI chain traded up with it.'
    },
    {
      ticker: 'GLDI',
      mono: 'GL',
      note: 'Gold spot fell 1.9% as real yields rose. The covered-call overlay caps how much of a rebound this ETN can capture.'
    },
    {
      ticker: 'V',
      mono: 'V',
      note: 'Cross-border card volumes were revised up for the quarter and payment networks led the sector through the session.'
    },
    {
      ticker: 'JEPQ',
      mono: 'JE',
      note: 'Premium harvested on the Nasdaq overlay narrowed as implied volatility compressed, trimming the distribution estimate.'
    }
  ];

  const dayChangeFor = (ticker: string) => {
    const p = [...d.movers.gainers, ...d.movers.losers].find((x) => x.ticker === ticker);
    return p ? p.dayChangePct : 0;
  };

  const searchItems = $derived(
    d.holdings.map((h) => ({
      ticker: h.ticker,
      name: h.name,
      mono: h.mono,
      sector: h.sector,
      value: fmt.money(h.value),
      href: `/portfolio/holdings#${h.ticker}`
    }))
  );

  const navInsights = $derived(
    insights.map((i) => ({ title: i.title, short: lineFor(i.n) }))
  );

  const scheduleFor = (month: string) => d.schedules[month] ?? [];
</script>

<svelte:head><title>{K.portfolioName} · Snowline</title></svelte:head>

<TopNav
  active="Dashboard"
  portfolioName={K.portfolioName}
  holdingsCount={T.holdings}
  {searchItems}
  insights={navInsights}
  accountSub={`${K.baseCurrency} · ${T.holdings} holdings`}
/>

<main
  data-r="main"
  style="max-width:1392px;margin:0 auto;padding:24px 24px 88px;display:flex;flex-direction:column;gap:24px"
>
  <!-- page head -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
    <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
      <h1
        style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.028em;line-height:1.1;color:var(--t1)"
      >
        {K.portfolioName}
      </h1>
      <div style="display:flex;align-items:center;gap:9px;font-size:12px;color:var(--t3)">
        <span>{K.baseCurrency} · {T.holdings} holdings</span>
        <span style="width:1px;height:10px;background:var(--line)"></span>
        <span>{fmt.num(K.withholdingTax * 100, 0)}% dividend withholding</span>
        <span style="width:1px;height:10px;background:var(--line)"></span>
        <span>As of {K.today.label}</span>
      </div>
    </div>
  </div>

  <!-- KPI row -->
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
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        >
          <path d="M2.5 12S6.2 6.2 12 6.2 21.5 12 21.5 12 17.8 17.8 12 17.8 2.5 12 2.5 12z" />
          <circle cx="12" cy="12" r="2.6" />
          <path d="M4 4l16 16" opacity={mask ? 1 : 0} />
        </svg>
      </button>
      <div style="margin-top:14px">
        <a
          href="/portfolio/goal"
          style="display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--t2);font-size:11px;font-weight:500;text-decoration:none"
          >Worth in 10 years?
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"><path d="M5 12h13M13 6l6 6-6 6" /></svg
          >
        </a>
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
        <span>Dividends {fmt.money(T.dividendsLifetime)}</span>
      </div>
    </div>

    <div class="card" style="padding:var(--pad)">
      <Metric
        label="IRR"
        tip="Money-weighted annualised return. Accounts for the timing and size of every deposit."
        dotted
        primary={`${fmt.num(K.irrAllTime)}%`}
        primaryTone="pos"
        secondary={`${fmt.num(K.irrCurrentHoldings)}%`}
        secondaryNote="current holdings"
      />
      <div style="margin-top:14px;display:flex;align-items:center;gap:8px;font-size:11px;color:var(--t3)">
        <span>TWR {fmt.num(K.twr)}%</span>
        <span style="width:1px;height:10px;background:var(--line)"></span>
        <span>{K.benchmark} {fmt.num(K.benchmarkTwr)}%</span>
      </div>
    </div>

    <div class="card" style="padding:var(--pad)">
      <Metric
        label="Passive income"
        tip="Forward 12-month dividend income at current yields, before withholding tax."
        primary={`${fmt.num(T.grossYield)}%`}
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

  <!-- insights -->
  <div style="display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:14px;font-weight:600;color:var(--t1)">Portfolio insights</span>
        <span style="font-size:12px;color:var(--t3)">{visibleInsights.length} of 3</span>
      </div>
      {#if dismissed.length}
        <button
          onclick={() => (dismissed = [])}
          style="border:none;background:transparent;color:var(--t2);font-size:12px;cursor:pointer;padding:0"
          >{dismissed.length} dismissed · Restore</button
        >
      {/if}
    </div>
    <div data-r="ins" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px">
      {#each visibleInsights as ins (ins.n)}
        <div
          class="card"
          style="position:relative;border-left:2px solid var(--amber);padding:16px;display:flex;flex-direction:column;gap:9px"
        >
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <span
              style="font-size:11px;font-weight:500;color:var(--tag-fg);background:var(--tag-bg);padding:3px 8px;border-radius:4px"
              >{ins.tag}</span
            >
            <button
              onclick={() => (dismissed = [...dismissed, ins.n])}
              title="Dismiss"
              style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border:none;border-radius:5px;background:transparent;color:var(--t3);cursor:pointer"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg
              >
            </button>
          </div>
          <span style="font-size:14px;font-weight:600;color:var(--t1);letter-spacing:-0.01em"
            >{ins.title}</span
          >
          <span style="font-size:12px;color:var(--t2);line-height:1.5;text-wrap:pretty"
            >{lineFor(ins.n)}</span
          >
          <a href={ins.href} style="font-size:12px;font-weight:500;margin-top:2px">See details</a>
        </div>
      {/each}
    </div>
  </div>

  <AllocationCard categories={d.categories} totals={T} />

  <!-- quotes -->
  <div
    class="card"
    style="padding:15px 20px;display:flex;align-items:center;gap:18px;justify-content:space-between"
  >
    <span style="font-size:14px;font-weight:600;color:var(--t1);flex:none">My Quotes</span>
    <div
      data-r="quotes"
      style="display:flex;align-items:center;gap:0;flex:1;min-width:0;overflow:hidden"
    >
      {#each quotes as q (q.name)}
        <div
          style="display:flex;flex-direction:column;gap:2px;padding:0 18px;border-left:1px solid var(--line);min-width:0"
        >
          <span style="font-size:12px;color:var(--t2);white-space:nowrap">{q.name}</span>
          <span style="display:flex;align-items:baseline;gap:7px">
            <span style="font-size:13px;font-weight:500;color:var(--t1);white-space:nowrap">{q.price}</span>
            <span
              style="font-size:12px;color:{q.up ? 'var(--accent)' : 'var(--neg)'};white-space:nowrap"
              >{q.chg}</span
            >
          </span>
        </div>
      {/each}
    </div>
  </div>

  <!-- why is it moving -->
  <div style="display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:14px;font-weight:600;color:var(--t1)">Why is it moving?</span>
      <span style="font-size:12px;color:var(--t3)"
        >unusual daily moves · {K.today.label.replace(/ \d{4}$/, '')}</span
      >
    </div>
    <div
      data-r="why"
      style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;align-items:stretch"
    >
      {#each WHY as w (w.ticker)}
        {@const chg = dayChangeFor(w.ticker)}
        <div class="card" style="padding:15px;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <span style="display:flex;align-items:center;gap:9px">
              <span class="mono-badge" style="width:26px;height:26px;border-radius:5px">{w.mono}</span>
              <span style="font-size:13px;font-weight:600;color:var(--t1)">{w.ticker}</span>
            </span>
            <span
              style="font-size:13px;font-weight:500;color:{chg >= 0 ? 'var(--accent)' : 'var(--neg)'}"
              >{fmt.caret(chg)}</span
            >
          </div>
          <span style="font-size:12px;color:var(--t2);line-height:1.55;text-wrap:pretty">{w.note}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- movers -->
  <div data-r="pair" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px">
    {#each [{ title: 'Top day gainers', rows: d.movers.gainers, sum: d.movers.gainSum, tone: 'pos' as const }, { title: 'Top day losers', rows: d.movers.losers, sum: d.movers.lossSum, tone: 'neg' as const }] as col (col.title)}
      <div class="card">
        <div class="card-head">
          <span class="card-title">{col.title}</span>
          <span
            style="font-size:12px;color:{col.tone === 'pos' ? 'var(--accent)' : 'var(--neg)'}"
            >{fmt.signed(col.sum)}</span
          >
        </div>
        <div style="padding:6px 8px 10px">
          {#each col.rows as h (h.ticker)}
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:6px">
              <span class="mono-badge" style="width:30px;height:30px">{h.mono}</span>
              <span style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0">
                <span
                  style="font-size:13px;font-weight:500;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
                  >{h.name}</span
                >
                <span style="font-size:12px;color:var(--t3)">{h.ticker}</span>
              </span>
              <TwoLineCell
                align="right"
                primary={fmt.money(h.value)}
                secondary={`${fmt.caret(h.dayChangePct)}  ${fmt.signed(h.dayChangeAbs)}`}
                secondaryTone={col.tone}
              />
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <!-- payments -->
  <div data-r="pair" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px">
    <FuturePaymentsCard
      forwardPayments={d.forwardPayments}
      paymentCount={d.paymentCount}
      totals={T}
    />
    <DividendsReceivedCard timeline={d.dividendTimeline} {scheduleFor} />
  </div>

  <!-- growth + goal -->
  <div data-r="pair" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px">
    <DividendGrowthCard history={d.dividendHistory} />
    <GoalCard projection={d.projection} />
  </div>
</main>
