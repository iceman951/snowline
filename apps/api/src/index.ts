import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Engine } from '@snowline/core';
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
    return {
      constants: e.constants,
      totals: e.totals(),
      categories: e.categories(),
      movers: e.movers(),
      dividendTimeline: e.dividendTimeline(),
      dividendHistory: e.dividendHistory,
      forwardPayments: e.forwardPayments(),
      paymentCount: e.paymentCountNext12(),
      projection: e.projection(loadGoalConfig())
    };
  });

export type App = typeof app;

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3001);
  app.listen(port);
  console.log(`Snowline API on http://localhost:${port}`);
}
