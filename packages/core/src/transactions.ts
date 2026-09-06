import type { Dataset, LedgerRow, Position } from './types.js';

export interface TransactionInput {
  kind: LedgerRow['kind'];
  operation: LedgerRow['operation'];
  ticker: string;
  customName?: string;
  date: string;
  shares: number;
  price: number;
  amount: number;
  fee: number;
  tax: number;
  currency: string;
  note: string;
  updateCash: boolean;
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Validate at the write boundary, independent of the browser's form controls. */
export function createTransaction(input: TransactionInput, positions: Position[], id: string): LedgerRow {
  const allowed = { trade: ['Buy', 'Sell'], income: ['Dividends'], expense: ['Fee', 'Tax'] };
  if (!allowed[input.kind]?.includes(input.operation)) throw new Error('Choose a valid operation.');
  const date = new Date(`${input.date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.date) {
    throw new Error('Enter a valid date.');
  }
  for (const key of ['shares', 'price', 'amount', 'fee', 'tax'] as const) {
    if (!Number.isFinite(input[key]) || input[key] < 0 || input[key] > 1e12) throw new Error(`Enter a valid non-negative ${key}.`);
  }
  // The portfolio currently has no currency conversion service.
  if (input.currency !== 'USD') throw new Error('Transactions currently support USD only.');
  const ticker = input.ticker.trim().toUpperCase();
  const position = positions.find(p => p.ticker === ticker);
  const customName = input.customName?.trim();
  if (ticker && !/^[A-Z0-9][A-Z0-9._-]{0,19}$/.test(ticker)) throw new Error('Use a ticker of up to 20 letters, numbers, dots, underscores or hyphens.');
  if (input.kind !== 'expense' && !ticker) throw new Error('Choose a ticker/company.');
  if (ticker && !position && !(customName && input.operation === 'Buy')) throw new Error('Choose an existing asset or add a custom asset with a Buy trade.');
  if (customName && position) throw new Error('This ticker already exists. Select it from the asset list.');
  if ((customName?.length ?? 0) > 120 || input.note.length > 2000) throw new Error('The asset name or note is too long.');
  if (position && position.currency !== input.currency) throw new Error('Use the asset currency.');
  if (input.kind === 'trade' && (input.shares <= 0 || input.price <= 0)) throw new Error('Shares and price must be greater than zero.');
  if (input.operation === 'Sell' && (!position || position.status !== 'open' || input.shares > position.shares + 1e-8)) throw new Error('You cannot sell more shares than you hold.');
  const gross = input.kind === 'trade' ? money(input.shares * input.price) : money(input.amount);
  if (gross <= 0 || gross > 1e12) throw new Error('Enter a total greater than zero and no more than 1 trillion.');
  const fee = input.kind === 'expense' ? (input.operation === 'Fee' ? gross : 0) : money(input.fee);
  const tax = input.kind === 'income' ? money(input.tax) : input.operation === 'Tax' ? gross : 0;
  if (input.kind === 'income' && fee + tax > gross) throw new Error('Fee and tax cannot exceed the total received.');
  const amount = input.kind === 'income' ? money(gross - tax) : gross;
  const signed = money(input.kind === 'expense' ? -gross : input.operation === 'Buy' ? -gross - fee : amount - fee);
  const shares = input.kind === 'trade' ? input.shares : input.kind === 'income' ? (position?.shares ?? 0) : 0;
  return {
    id, kind: input.kind, operation: input.operation, ticker, name: position?.name ?? customName ?? 'Portfolio expense',
    mono: position?.mono ?? (ticker.slice(0, 2) || '$'), currency: input.currency,
    date: `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
    shares, price: input.kind === 'trade' ? input.price : shares ? gross / shares : 0,
    amount, fee, tax, signed, note: input.note.trim(), updateCash: input.updateCash,
    ...(input.operation === 'Sell' && position ? { costBasis: position.costTotal * input.shares / position.shares } : {})
  };
}

function newPosition(row: LedgerRow, cash = false): Position {
  return {
    ticker: cash ? 'CASH.USD' : row.ticker, name: cash ? 'US dollar cash' : row.name,
    mono: cash ? '$' : row.mono, status: 'open', shares: 0, costTotal: 0, costPerShare: 0, value: 0,
    price: cash ? 1 : row.price, yieldPct: 0, frequency: 'Quarterly', sector: cash ? 'Cash' : 'Other',
    assetClass: cash ? 'Cash' : 'Stock', currency: row.currency, fxToUsd: 1,
    dayChangePct: 0, dayChangeAbs: 0, dividendsReceived: 0, realizedPnL: 0, realizedDate: null, irr: 0,
    dividendGrowth5Y: null, payoutRatio: null, nextExDate: null, nextPayDate: null, caveat: null,
    soldDate: null, soldProceeds: null, soldCost: null, soldShares: null
  };
}

/** Replay entries in insertion order over the opening snapshot, preserving its historical lots. */
export function applyTransactions(data: Dataset) {
  const positions = data.positions.map(p => ({ ...p }));
  const dividendHistory = Object.fromEntries(Object.entries(data.dividendHistory).map(([year, values]) => [year, [...values]]));
  for (const row of data.transactions ?? []) {
    let p = positions.find(p => p.ticker === row.ticker);
    if (!p && row.operation === 'Buy') { p = newPosition(row); positions.push(p); }
    if (p && row.kind === 'trade') {
      if (row.operation === 'Buy') {
        if (p.status === 'sold') { p.shares = 0; p.costTotal = 0; }
        p.status = 'open';
        p.shares += row.shares;
        p.costTotal = money(p.costTotal + row.amount + row.fee);
      } else {
        const cost = p.shares ? p.costTotal * row.shares / p.shares : 0;
        p.shares = Math.max(0, p.shares - row.shares);
        p.costTotal = money(p.costTotal - cost);
        p.realizedPnL = money(p.realizedPnL + row.signed - cost);
        p.realizedDate = row.date;
        if (p.shares < 1e-8) {
          p.shares = 0; p.costTotal = 0; p.status = 'sold'; p.soldDate = row.date;
          p.soldCost = cost; p.soldProceeds = row.signed; p.soldShares = row.shares;
        }
      }
      p.costPerShare = p.shares ? p.costTotal / p.shares : 0;
      p.value = money(p.shares * p.price);
    }
    if (p && row.kind === 'income') {
      p.dividendsReceived = money(p.dividendsReceived + row.signed);
      const [, month, year] = row.date.split(' ');
      dividendHistory[+year] = Array.from({ length: 12 }, (_, i) => dividendHistory[+year]?.[i] ?? 0);
      const index = months.indexOf(month);
      dividendHistory[+year][index] = money((dividendHistory[+year][index] ?? 0) + row.signed);
    }
    if (row.updateCash) {
      let cash = positions.find(p => p.assetClass === 'Cash' && p.currency === row.currency && p.status === 'open');
      if (!cash) { cash = newPosition(row, true); positions.push(cash); }
      cash.value = money(cash.value + row.signed);
      cash.shares = cash.price ? cash.value / cash.price : cash.value;
      cash.costTotal = cash.value;
      cash.costPerShare = cash.price;
    }
  }
  return { positions, dividendHistory };
}
