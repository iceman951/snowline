import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Engine, MONTHS } from '@snowline/core';
import {
  clearGoalConfig,
  loadDataset,
  loadGoalConfig,
  saveCategoryModel,
  saveGoalConfig
} from './db/index.js';

/** A fresh engine per request — the dataset is read from SQLite each time. */
const engine = () => new Engine(loadDataset());

export const app = new Elysia()
  .use(cors({ origin: true }))
  .onError(({ code, error, set }) => {
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { error: 'Not found' };
    }
    set.status = 500;
    console.error(error);
    return { error: error instanceof Error ? error.message : 'Internal error' };
  })

  .get('/health', () => ({ ok: true }))

  /* ---- portfolio ------------------------------------------------------- */

  .get('/api/portfolio', () => {
    const e = engine();
    return { constants: e.constants, totals: e.totals() };
  })

  .get('/api/holdings', ({ query }) => {
    const e = engine();
    return e.holdings(query.includeSold === 'true');
  }, {
    query: t.Object({ includeSold: t.Optional(t.String()) })
  })

  .get('/api/holdings/:ticker', ({ params, set }) => {
    const e = engine();
    const p = e.byTicker(params.ticker.toUpperCase());
    if (!p) {
      set.status = 404;
      return { error: `No position ${params.ticker}` };
    }
    return e.holding(p);
  })

  .get('/api/categories', ({ query }) => engine().categories(query.ordered === 'true'), {
    query: t.Object({ ordered: t.Optional(t.String()) })
  })

  .put('/api/categories/model', ({ body }) => {
    saveCategoryModel(body);
    return engine().categories();
  }, {
    body: t.Object({
      order: t.Array(t.String()),
      targets: t.Record(t.String(), t.Number()),
      assign: t.Record(t.String(), t.String())
    })
  })

  .get('/api/movers', () => engine().movers())

  /* ---- dividends -------------------------------------------------------- */

  .get('/api/dividends/timeline', () => engine().dividendTimeline())

  .get('/api/dividends/forward', () => {
    const e = engine();
    return { months: e.forwardPayments(), paymentCount: e.paymentCountNext12() };
  })

  .get('/api/dividends/schedule/:month', ({ params }) => engine().scheduleFor(params.month))

  /* ---- ledger and corporate actions ------------------------------------- */

  .get('/api/ledger', ({ query }) => {
    const e = engine();
    let rows = e.ledger.ledger();
    if (query.ticker) rows = rows.filter((r) => r.ticker === query.ticker!.toUpperCase());
    if (query.kind) rows = rows.filter((r) => r.kind === query.kind);
    return { rows, totals: e.ledger.ledgerTotals(rows) };
  }, {
    query: t.Object({ ticker: t.Optional(t.String()), kind: t.Optional(t.String()) })
  })

  .get('/api/ledger/reconciliation', () => engine().ledger.ledgerReconciliation())

  .get('/api/corporate-actions', () => {
    const e = engine();
    return { log: e.ledger.corporateActionLog(), stats: e.ledger.corporateActionStats() };
  })

  /* ---- per-holding detail, for the holdings drawer ---------------------- */

  .get('/api/holdings/:ticker/detail', ({ params, set }) => {
    const e = engine();
    const ticker = params.ticker.toUpperCase();
    const p = e.byTicker(ticker);
    if (!p) {
      set.status = 404;
      return { error: `No position ${ticker}` };
    }
    return {
      holding: e.holding(p),
      transactions: e.ledger.transactionsFor(ticker),
      dividends: e.dividendsFor(ticker, 5),
      priceSeries: e.ledger.priceSeries(ticker, 60),
      corporateActions: e.ledger.corporateActionsFor(ticker),
      exchanges: e.exchangesFor(ticker)
    };
  })

  /* ---- goal ------------------------------------------------------------- */

  .get('/api/goal/projection', () => engine().projection(loadGoalConfig()))

  .put('/api/goal/config', ({ body }) => {
    saveGoalConfig(body);
    return engine().projection(loadGoalConfig());
  }, {
    body: t.Partial(
      t.Object({
        mode: t.Union([t.Literal('value'), t.Literal('income')]),
        valueTarget: t.Number(),
        incomeTarget: t.Number(),
        byYear: t.Number(),
        monthlyContribution: t.Number(),
        contributionGrowth: t.Number(),
        expectedReturn: t.Number(),
        safeReturn: t.Number(),
        dividendGrowth: t.Number(),
        inflation: t.Number(),
        reinvestDividends: t.Boolean(),
        taxDrag: t.Number()
      })
    )
  })

  .delete('/api/goal/config', () => {
    clearGoalConfig();
    return engine().projection(null);
  })

  /* ---- composite: everything the Dashboard renders in one round trip ---- */

  .get('/api/dashboard', () => {
    const e = engine();

    // Per-calendar-month payer breakdown, so the received chart can attribute
    // a month's total to tickers without a second round trip.
    const schedules: Record<string, ReturnType<Engine['scheduleFor']>> = {};
    for (const m of MONTHS) schedules[m] = e.scheduleFor(m);

    return {
      constants: e.constants,
      totals: e.totals(),
      categories: e.categories(),
      movers: e.movers(),
      holdings: e.open().map((p) => ({
        ticker: p.ticker,
        name: p.name,
        mono: p.mono,
        sector: p.sector,
        value: p.value
      })),
      dividendTimeline: e.dividendTimeline(),
      dividendHistory: e.dividendHistory,
      forwardPayments: e.forwardPayments(),
      paymentCount: e.paymentCountNext12(),
      schedules,
      projection: e.projection(loadGoalConfig())
    };
  })

  /* ---- composite: the Holdings screen ----------------------------------- */

  .get('/api/screens/holdings', () => {
    const e = engine();
    return {
      constants: e.constants,
      totals: e.totals(),
      // Sold positions are included so the table's "show sold" toggle needs no
      // second request; the client filters.
      holdings: e.holdings(true)
    };
  });

export type App = typeof app;

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3001);
  app.listen(port);
  console.log(`Snowline API on http://localhost:${port}`);
}
