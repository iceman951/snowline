import { describe, expect, it } from 'bun:test';
import { LedgerEngine, type CorporateAction, type LedgerRow } from '../src/index.js';

const buy = (id: string, date: string, shares: number): LedgerRow => ({
  id, date, shares, kind: 'trade', operation: 'Buy', ticker: 'TEST', name: 'Test', mono: 'T',
  currency: 'USD', price: 10, amount: shares * 10, signed: -shares * 10, fee: 0, tax: 0, note: '', updateCash: false
});
const ledger = (rows: LedgerRow[], actions: CorporateAction[] = []) => new LedgerEngine([], actions, 0, { year: 2026, monthIndex: 8, label: '6 Sep 2026' }, rows);

describe('remaining transaction shares', () => {
  it('allocates a partial sale to the oldest lot and excludes sold positions', () => {
    const e = ledger([buy('old', '1 Jan 2026', 10), buy('new', '1 Feb 2026', 5)]);
    expect(e.remainingShares([{ ticker: 'TEST', status: 'open', shares: 8 }])).toEqual({ new: 5, old: 3 });
    expect(e.remainingShares([{ ticker: 'TEST', status: 'sold', shares: 0 }])).toEqual({ new: 0, old: 0 });
  });
  it('compares pre-split buys with the current share balance on the same basis', () => {
    const split: CorporateAction = { id: 'split', date: '15 Jan 2026', type: 'Stock split', ticker: 'TEST', headline: '', detail: '', ratio: 2, basisAdjust: 0, status: 'Completed', cash: 0 };
    const e = ledger([buy('old', '1 Jan 2026', 10), buy('new', '1 Feb 2026', 5)], [split]);
    expect(e.remainingShares([{ ticker: 'TEST', status: 'open', shares: 23 }])).toEqual({ new: 5, old: 18 });
  });
  it('keeps same-day purchases deterministic and independent of table filtering', () => {
    const e = ledger([buy('first', '1 Jan 2026', 10), buy('second', '1 Jan 2026', 5)]);
    expect(e.remainingShares([{ ticker: 'TEST', status: 'open', shares: 4 }])).toEqual({ second: 4, first: 0 });
  });
});
