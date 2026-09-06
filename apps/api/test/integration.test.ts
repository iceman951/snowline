/** HTTP + SQLite contract checks; all writes use a fresh in-memory database. */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { Engine, MONTHS } from '@snowline/core';
import { app } from '../src/index.js';
import { loadDataset, loadGoalConfig, useDatabase } from '../src/db/index.js';
import { runSeed } from '../src/db/seed.js';

let db: Database;
beforeEach(() => {
  db = useDatabase(new Database(':memory:'));
  runSeed();
});
afterEach(() => db.close());

function request(path: string, method = 'GET', body?: unknown) {
  return app.handle(new Request(`http://localhost${path}`, {
    method,
    ...(body === undefined ? {} : {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  }));
}

async function json(path: string, method = 'GET', body?: unknown) {
  const response = await request(path, method, body);
  expect(response.status, `${method} ${path}`).toBe(200);
  return response.json();
}

describe('API reads from SQLite', () => {
  it('returns health and the persisted portfolio facts', async () => {
    expect(await json('/health')).toEqual({ ok: true });
    const engine = new Engine(loadDataset());
    expect(await json('/api/portfolio')).toEqual({ constants: engine.constants, totals: engine.totals() });
  });

  it('distinguishes open, sold, lowercase and missing holdings', async () => {
    const engine = new Engine(loadDataset());
    expect(await json('/api/holdings')).toEqual(engine.holdings());
    expect(await json('/api/holdings?includeSold=false')).toEqual(engine.holdings());
    expect(await json('/api/holdings?includeSold=true')).toEqual(engine.holdings(true));
    expect(await json('/api/holdings/gldi')).toEqual(engine.holding(engine.byTicker('GLDI')!));
    expect(await json('/api/holdings/TSM')).toEqual(engine.holding(engine.byTicker('TSM')!));
    expect((await request('/api/holdings/DOES_NOT_EXIST')).status).toBe(404);
  });

  it('keeps dividend details and dashboard composites consistent', async () => {
    const engine = new Engine(loadDataset());
    const dashboard = await json('/api/dashboard');
    expect(dashboard.totals).toEqual((await json('/api/portfolio')).totals);
    expect(dashboard.categories).toEqual(await json('/api/categories'));
    expect(dashboard.movers).toEqual(await json('/api/movers'));
    expect(dashboard.dividendTimeline).toEqual(await json('/api/dividends/timeline'));
    expect(dashboard.forwardPayments).toEqual((await json('/api/dividends/forward')).months);
    expect(dashboard.paymentCount).toBe(engine.paymentCountNext12());
    expect(dashboard.projection).toEqual(await json('/api/goal/projection'));
    for (const month of MONTHS) {
      expect(await json(`/api/dividends/schedule/${month}`)).toEqual(engine.scheduleFor(month));
      expect(dashboard.schedules[month]).toEqual(engine.scheduleFor(month));
    }
  });

  it('rebuilds the engine on each request after facts change', async () => {
    const before = await json('/api/portfolio');
    db.run('UPDATE positions SET value = value + 100 WHERE ticker = ?', ['GLDI']);
    const after = await json('/api/portfolio');
    expect(after.totals.value - before.totals.value).toBeCloseTo(100, 8);
    expect((await json('/api/dashboard')).totals).toEqual(after.totals);
  });

  it('returns 404 for an unknown route', async () => {
    const response = await request('/api/not-a-route');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
  });
});

describe('user settings persist across API calls', () => {
  const model = {
    order: ['Reserve', 'Income'], targets: { Reserve: 20, Income: 80 },
    assign: { BIL: 'Reserve', DIMEFCD: 'Reserve', GLDI: 'Income' }
  };

  it('category edits update ordered buckets, holdings and the dashboard together', async () => {
    const saved = await json('/api/categories/model', 'PUT', model);
    const engine = new Engine(loadDataset());
    expect(saved).toEqual(engine.categories());
    expect(await json('/api/categories?ordered=true')).toEqual(engine.categories(true));
    expect((await json('/api/holdings/GLDI')).categoryName).toBe('Income');
    expect((await json('/api/dashboard')).categories).toEqual(saved);
  });

  it('saves goal settings, uses them on the dashboard and restores defaults on delete', async () => {
    const baseline = await json('/api/goal/projection');
    const config = { mode: 'income', incomeTarget: 12000, monthlyContribution: 900, reinvestDividends: false };
    const saved = await json('/api/goal/config', 'PUT', config);
    expect(loadGoalConfig()).toEqual(config);
    expect(saved.mode).toBe('income');
    expect(saved.target).toBe(12000);
    expect(await json('/api/goal/projection')).toEqual(saved);
    expect((await json('/api/dashboard')).projection).toEqual(saved);
    expect(await json('/api/goal/config', 'DELETE')).toEqual(baseline);
    expect(loadGoalConfig()).toBeNull();
    expect(await json('/api/goal/projection')).toEqual(baseline);
  });

  it('reseeding is idempotent and preserves user overrides', async () => {
    await json('/api/categories/model', 'PUT', model);
    await json('/api/goal/config', 'PUT', { monthlyContribution: 850 });
    const before = await json('/api/dashboard');
    const actions = loadDataset().corporateActions;
    runSeed();
    runSeed();
    expect(await json('/api/dashboard')).toEqual(before);
    expect(loadDataset().corporateActions).toEqual(actions);
    expect(db.query('PRAGMA foreign_key_check').all()).toEqual([]);
  });
});

describe('invalid requests do not overwrite saved settings', () => {
  for (const [path, body] of [
    ['/api/categories/model', { order: 'wrong', targets: {}, assign: {} }],
    ['/api/categories/model', { order: ['Income'], targets: { Income: 'wrong' }, assign: {} }],
    ['/api/goal/config', { mode: 'unknown' }],
    ['/api/goal/config', { monthlyContribution: 'wrong' }]
  ] as const) {
    it(`rejects invalid ${path} body ${JSON.stringify(body)}`, async () => {
      const before = await json('/api/dashboard');
      const response = await request(path, 'PUT', body);
      expect(response.status).toBe(422);
      expect(await json('/api/dashboard')).toEqual(before);
    });
  }

  it('rejects malformed JSON with a client error', async () => {
    const response = await app.handle(new Request('http://localhost/api/goal/config', {
      method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{'
    }));
    expect(response.status).toBe(400);
    expect(loadGoalConfig()).toBeNull();
  });
});
