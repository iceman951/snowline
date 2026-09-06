import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { Engine, type TransactionInput } from '@snowline/core';
import { app } from '../src/index.js';
import { loadDataset, useDatabase } from '../src/db/index.js';
import { runSeed } from '../src/db/seed.js';

let db: Database;
beforeEach(() => { db = useDatabase(new Database(':memory:')); runSeed(); });
afterEach(() => db.close());
const input: TransactionInput = {
  kind: 'trade', operation: 'Buy', ticker: 'SCHD', date: '2026-09-06', shares: 2,
  price: 30, amount: 0, fee: 1, tax: 0, currency: 'USD', note: 'New purchase', updateCash: true
};
const engine = () => new Engine(loadDataset());
async function create(patch: Partial<TransactionInput> = {}) {
  return app.handle(new Request('http://localhost/api/transactions', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, ...patch })
  }));
}

describe('saved transactions', () => {
  it('persists a buy, adjusts holdings and cash once, and preserves historical rows', async () => {
    const before = engine();
    const response = await create();
    expect(response.status).toBe(200);
    const row = await response.json();
    const after = engine();
    expect(after.byTicker('SCHD')!.shares).toBeCloseTo(before.byTicker('SCHD')!.shares + 2, 8);
    expect(after.byTicker('SCHD')!.costTotal).toBeCloseTo(before.byTicker('SCHD')!.costTotal + 61, 8);
    expect(after.cashFloat()).toBeCloseTo(before.cashFloat() - 61, 8);
    expect(after.ledger.ledger().filter(r => r.id === row.id)).toHaveLength(1);
    expect(after.ledger.ledger().filter(r => r.updateCash === undefined)).toEqual(before.ledger.ledger());
    expect(engine().totals()).toEqual(after.totals());
  });

  it('records net dividends and fees, and leaves cash unchanged when unchecked', async () => {
    const before = engine();
    const response = await create({ kind: 'income', operation: 'Dividends', amount: 100, fee: 2, tax: 15, updateCash: false });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ amount: 85, fee: 2, tax: 15, signed: 83 });
    const after = engine();
    expect(after.cashFloat()).toBe(before.cashFloat());
    expect(after.byTicker('SCHD')!.dividendsReceived).toBeCloseTo(before.byTicker('SCHD')!.dividendsReceived + 83, 8);
    expect(after.dividendHistory[2026][8]).toBeCloseTo((before.dividendHistory[2026][8] ?? 0) + 83, 8);
  });

  it('records a portfolio expense without a ticker and deducts it once', async () => {
    const cash = engine().cashFloat();
    const response = await create({ kind: 'expense', operation: 'Fee', ticker: '', amount: 5 });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ kind: 'expense', amount: 5, fee: 5, tax: 0, signed: -5 });
    expect(engine().cashFloat()).toBeCloseTo(cash - 5, 8);
    expect(engine().history.cashFlow().rows.some(r => r.type === 'Fee' && r.signed === -5)).toBe(true);
  });

  it('creates a custom asset and supports a subsequent full sale', async () => {
    expect((await create({ ticker: 'CUSTOM', customName: 'Custom asset', shares: 4, price: 25, fee: 0 })).status).toBe(200);
    expect(engine().byTicker('CUSTOM')).toMatchObject({ shares: 4, costTotal: 100, value: 100 });
    const sale = await create({ ticker: 'CUSTOM', operation: 'Sell', shares: 4, price: 30, fee: 1 });
    expect(sale.status).toBe(200);
    expect(await sale.json()).toMatchObject({ costBasis: 100, signed: 119 });
    expect(engine().byTicker('CUSTOM')).toMatchObject({ status: 'sold', shares: 0, costTotal: 0, realizedPnL: 19 });
  });

  it.each([
    { shares: 0 }, { price: -1 }, { date: '2026-02-30' }, { date: '' }, { ticker: 'UNKNOWN' },
    { kind: 'trade', operation: 'Fee' }, { operation: 'Sell', shares: 1e9 }, { currency: 'EUR' },
    { kind: 'income', operation: 'Dividends', amount: 10, tax: 11 },
    { kind: 'expense', operation: 'Fee', ticker: '', amount: 0 }
  ] as Partial<TransactionInput>[])('rejects invalid input without changing the portfolio: %j', async patch => {
    const before = engine();
    expect((await create(patch)).status).toBeGreaterThanOrEqual(400);
    expect(engine().totals()).toEqual(before.totals());
    expect(engine().ledger.ledger()).toEqual(before.ledger.ledger());
  });
});
