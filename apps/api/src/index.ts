import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { editCategories, Engine, MONTHS } from '@snowline/core';
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
    // Request mistakes must retain their client status so forms can ask for
    // corrections instead of reporting a server outage.
    if (code === 'VALIDATION') {
      set.status = 422;
      return { error: 'Invalid request data' };
    }
    if (code === 'PARSE') {
      set.status = 400;
      return { error: 'Malformed request body' };
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

  .get('/api/categories/editor', () => {
    const e = engine();
    return {
      constants: e.constants, totals: e.totals(), categories: e.categories(true),
      holdings: e.holdings(), targetTotal: e.targetTotal(), model: e.categoryModel()
    };
  })

  // Read and edit the current model in one synchronous request so a stale
  // browser page cannot overwrite unrelated edits with an older full model.
  .post('/api/categories/edit', ({ body }) => {
    const model = editCategories(engine(), body);
    saveCategoryModel(model);
    return model;
  }, {
    body: t.Union([
      t.Object({ kind: t.Literal('create'), name: t.String(), target: t.Number() }),
      t.Object({ kind: t.Literal('rename'), name: t.String(), to: t.String() }),
      t.Object({ kind: t.Literal('target'), name: t.String(), target: t.Number() }),
      t.Object({ kind: t.Literal('assign'), ticker: t.String(), name: t.String() }),
      t.Object({ kind: t.Literal('delete'), name: t.String(), moveTo: t.String() }),
      t.Object({ kind: t.Literal('move'), name: t.String(), delta: t.Union([t.Literal(-1), t.Literal(1)]) }),
      t.Object({ kind: t.Literal('normalise') }),
      t.Object({ kind: t.Literal('reset') })
    ])
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

  /* ---- composite: the My goal screen ------------------------------------- */

  /**
   * The projection plus the scenario grid. Scenarios each run the engine
   * again, and the required-contribution solver runs it ~68 times, so this
   * stays on the server rather than shipping the engine to the browser.
   */
  .get('/api/screens/goal', () => {
    const e = engine();
    const projection = e.projection(loadGoalConfig());
    const cfg = projection.cfg;

    const scenario = (name: string, patch: Partial<typeof cfg>, self = false) => {
      const p = e.projection({ ...cfg, ...patch });
      return {
        name,
        self,
        expectedReturn: p.cfg.expectedReturn,
        crossPYear: p.crossPYear,
        yearsToGoal: p.yearsToGoal,
        endValue: p.endValue,
        byYear: p.byYear
      };
    };

    return {
      constants: e.constants,
      totals: e.totals(),
      projection,
      scenarios: [
        scenario('Safe scenario', { expectedReturn: cfg.safeReturn }),
        scenario('Expected return − 5pp', { expectedReturn: cfg.expectedReturn - 0.05 }),
        scenario('Expected return', {}, true),
        scenario('Expected return + 5pp', { expectedReturn: cfg.expectedReturn + 0.05 }),
        scenario('No further contributions', { monthlyContribution: 0 }),
        scenario('Dividends taken as cash', { reinvestDividends: false })
      ],
      // Only meaningful when the goal is currently out of reach.
      requiredContribution: projection.achievable ? null : e.requiredContribution(cfg)
    };
  })

  /* ---- composite: the Dividend calendar ---------------------------------- */

  /**
   * `offset` moves the open month, `windowOffset` moves the 12-month chart, both
   * in months from today. Filtering stays client-side, so the raw events for
   * both are returned unfiltered.
   */
  .get('/api/screens/dividend-calendar', ({ query }) => {
    const e = engine();
    const { today } = e.constants;

    const shift = (n: number) => {
      const t = today.year * 12 + today.monthIndex + n;
      return { year: Math.floor(t / 12), monthIndex: ((t % 12) + 12) % 12 };
    };

    const offset = Number(query.offset ?? 0) || 0;
    const windowOffset = Number(query.windowOffset ?? 0) || 0;
    const cur = shift(offset);
    const win = shift(windowOffset * 12);

    return {
      constants: e.constants,
      totals: e.totals(),
      month: e.calendarMonth(cur.year, cur.monthIndex),
      year: e.calendarYear(win.year, win.monthIndex),
      paymentCount: e.paymentCountNext12(),
      payerCount: e.payers().length
    };
  }, {
    query: t.Object({ offset: t.Optional(t.String()), windowOffset: t.Optional(t.String()) })
  })

  /* ---- composite: the Corporate actions screen --------------------------- */

  .get('/api/screens/corporate-actions', () => {
    const e = engine();
    return {
      constants: e.constants,
      totals: e.totals(),
      log: e.ledger.corporateActionLog(),
      stats: e.ledger.corporateActionStats(),
      // The audit trail is only trustworthy alongside the proof that nothing
      // it records has silently moved a stored number.
      reconciliation: e.ledger.ledgerReconciliation()
    };
  })

  /* ---- composite: the Transactions screen -------------------------------- */

  .get('/api/screens/transactions', () => {
    const e = engine();
    const rows = e.ledger.ledger();
    return {
      constants: e.constants,
      totals: e.totals(),
      rows,
      ledgerTotals: e.ledger.ledgerTotals(rows),
      reconciliation: e.ledger.ledgerReconciliation(),
      instrumentCount: e.positions.length,
      // Today's price per ticker, so a row can show the gain on what it bought
      // without the client holding the whole position list.
      prices: Object.fromEntries(
        e.positions.map((p) => [
          p.ticker,
          { price: p.price, soldCost: p.soldCost, status: p.status }
        ])
      )
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
