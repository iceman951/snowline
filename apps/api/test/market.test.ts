import { beforeEach, afterEach, expect, it, spyOn } from 'bun:test';
import { Database } from 'bun:sqlite';
import { Engine } from '@snowline/core';
import { loadDataset, useDatabase } from '../src/db/index.js';
import { runSeed } from '../src/db/seed.js';
import { MarketCache, marketCache } from '../src/market.js';
import { app } from '../src/index.js';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let db: Database;
beforeEach(() => { db = useDatabase(new Database(':memory:')); runSeed(); });
afterEach(() => db.close());

it('revalues holdings without changing cost basis, income or historical transactions', () => {
  const data = loadDataset();
  const before = new Engine(data);
  const p = before.open().find(p => p.assetClass !== 'Cash')!;
  const price = p.price * 1.5;
  const after = new Engine({ ...data, marketQuotes: { [p.ticker]: {
    price, previousClose: price / 1.1, currency: p.currency, asOf: '2026-09-04T00:00:00Z'
  } } });
  const changed = after.byTicker(p.ticker)!;
  expect(changed.value).toBeCloseTo(p.shares * price, 6);
  expect(changed.dayChangePct).toBeCloseTo(10, 6);
  expect(changed.dayChangeAbs).toBeCloseTo(p.shares * (price - price / 1.1), 6);
  expect(changed.costTotal).toBe(p.costTotal);
  expect(after.annualGross(changed)).toBe(before.annualGross(p));
  expect(after.ledger.ledger()).toEqual(before.ledger.ledger());
  expect(data.positions.find(row => row.ticker === p.ticker)!.price).toBe(p.price);
});

it('ignores invalid prices and mismatched currencies', () => {
  const data = loadDataset();
  const before = new Engine(data);
  const p = before.open()[0];
  for (const quote of [
    { price: 0, previousClose: 10, currency: p.currency },
    { price: 100, previousClose: NaN, currency: p.currency },
    { price: 100, previousClose: 90, currency: 'INVALID' }
  ]) {
    const after = new Engine({ ...data, marketQuotes: { [p.ticker]: { ...quote, asOf: '2026-09-04' } } });
    expect(after.holdings(true)).toEqual(before.holdings(true));
  }
});

const quote = { price: 120, previousClose: 100, currency: 'USD', asOf: '2026-09-04T00:00:00-04:00' };
const batch = (symbols: string[]) => Object.fromEntries(symbols.map(s => [s, quote]));

it('caches by Thai calendar day, fetches new symbols only and status never fetches', async () => {
  let now = Date.parse('2026-09-07T16:59:00Z');
  const calls: string[][] = [];
  const cache = new MarketCache(db, async symbols => { calls.push(symbols); return batch(symbols); }, () => now);
  cache.status(['AAPL']);
  expect(calls).toHaveLength(0);
  await cache.ensure(['AAPL']);
  await cache.ensure(['AAPL']);
  await cache.ensure(['AAPL', 'MSFT']);
  expect(calls).toEqual([['AAPL'], ['MSFT']]);
  now = Date.parse('2026-09-07T17:00:00Z');
  expect(cache.status(['AAPL']).entries[0].state).toBe('stale');
  await cache.ensure(['AAPL', 'MSFT']);
  expect(calls[2]).toEqual(['AAPL', 'MSFT']);
  expect(cache.status(['AAPL']).entries[0].asOf).toBe(quote.asOf);
});

it('persists quotes across closing and reopening SQLite', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'snowline-market-'));
  const path = join(dir, 'cache.sqlite');
  let persistent = new Database(path);
  try {
    persistent.exec(readFileSync(new URL('../src/db/schema.sql', import.meta.url), 'utf8'));
    const now = () => Date.parse('2026-09-07T12:00:00Z');
    await new MarketCache(persistent, async symbols => batch(symbols), now).ensure(['AAPL']);
    persistent.close();
    persistent = new Database(path);
    let called = false;
    const restarted = new MarketCache(persistent, async () => { called = true; return {}; }, now);
    await restarted.ensure(['AAPL']);
    expect(called).toBe(false);
    expect(restarted.quotes().AAPL).toEqual(quote);
  } finally { persistent.close(); rmSync(dir, { recursive: true }); }
});

it('coalesces concurrent requests and handles overlapping symbol sets', async () => {
  const calls: string[][] = [];
  const cache = new MarketCache(db, async symbols => {
    calls.push(symbols);
    await new Promise(resolve => setTimeout(resolve, 5));
    return batch(symbols);
  });
  await Promise.all([cache.ensure(['AAPL']), cache.ensure(['AAPL', 'MSFT']), cache.ensure(['AAPL', 'MSFT', 'O'])]);
  expect(calls).toEqual([['AAPL'], ['MSFT'], ['O']]);
});

it('retains successful quotes on partial failure and retries only failures after five minutes', async () => {
  let now = Date.parse('2026-09-07T12:00:00Z');
  let failing = false;
  const calls: string[][] = [];
  const cache = new MarketCache(db, async symbols => {
    calls.push(symbols);
    return batch(failing ? symbols.filter(s => s !== 'MSFT') : symbols);
  }, () => now);
  await cache.ensure(['AAPL', 'MSFT']);
  now += 86400_000;
  failing = true;
  await cache.ensure(['AAPL', 'MSFT']);
  expect(cache.quotes().MSFT).toEqual(quote);
  expect(cache.status(['MSFT']).entries[0].state).toBe('stale');
  await cache.ensure(['AAPL', 'MSFT']);
  expect(calls).toHaveLength(2);
  now += 300_000;
  await cache.ensure(['AAPL', 'MSFT']);
  expect(calls[2]).toEqual(['MSFT']);
});

it('manual refresh bypasses daily cache but enforces a persisted 60 second cooldown', async () => {
  let now = Date.parse('2026-09-07T12:00:00Z');
  let count = 0;
  const fetcher = async (symbols: string[]) => { count++; return batch(symbols); };
  const cache = new MarketCache(db, fetcher, () => now);
  await cache.ensure(['AAPL']);
  await cache.ensure(['AAPL'], true);
  expect(count).toBe(2);
  const restarted = new MarketCache(db, fetcher, () => now);
  expect((await restarted.ensure(['AAPL'], true)).retryAfter).toBe(60);
  now += 60_000;
  await restarted.ensure(['AAPL'], true);
  expect(count).toBe(3);
});

it('rejects malformed provider data and retains stored prices with retry backoff', async () => {
  let count = 0;
  const cache = new MarketCache(db, async () => { count++; return { AAPL: { ...quote, price: NaN } }; });
  await cache.ensure(['AAPL']);
  await cache.ensure(['AAPL']);
  expect(count).toBe(1);
  expect(cache.quotes()).toEqual({});
  expect(cache.status(['AAPL']).entries[0].state).toBe('stored');
});

it('HTTP reads await quotes, status is read-only and manual refresh returns Retry-After', async () => {
  const oldEnv = process.env.NODE_ENV;
  const oldMode = process.env.SNOWLINE_PRICES;
  process.env.NODE_ENV = 'development';
  delete process.env.SNOWLINE_PRICES;
  const cache = marketCache();
  const refresh = spyOn(cache, 'ensure').mockImplementation(async () => {
    db.run('INSERT OR REPLACE INTO market_quotes VALUES (?, ?, ?, ?, 0)', ['AMZN', JSON.stringify(quote), Date.now(), Date.now()]);
    return { retryAfter: 0 };
  });
  try {
    const status = await app.handle(new Request('http://localhost/api/market/status'));
    expect(status.status).toBe(200);
    expect(refresh).not.toHaveBeenCalled();
    const response = await app.handle(new Request('http://localhost/api/holdings/AMZN'));
    expect(response.status).toBe(200);
    expect((await response.json()).p.price).toBe(quote.price);
    expect(refresh).toHaveBeenCalledTimes(1);
    refresh.mockImplementation(async () => ({ retryAfter: 42 }));
    const limited = await app.handle(new Request('http://localhost/api/market/refresh', { method: 'POST' }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBe('42');
  } finally {
    refresh.mockRestore();
    if (oldEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnv;
    if (oldMode === undefined) delete process.env.SNOWLINE_PRICES; else process.env.SNOWLINE_PRICES = oldMode;
  }
});
