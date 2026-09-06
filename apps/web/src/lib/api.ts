/** Typed access to the Elysia API. Called from `load`, never from a component. */

import type {
  CalendarMonth,
  Category,
  CategoryEdit,
  CategoryModel,
  Constants,
  DividendHistory,
  ForwardMonth,
  Holding,
  LedgerRow,
  Movers,
  Projection,
  ScheduleRow,
  TimelinePoint,
  Totals
} from '@snowline/core';

const BASE = process.env.SNOWLINE_API ?? 'http://localhost:3001';

export interface HoldingSummary {
  ticker: string;
  name: string;
  mono: string;
  sector: string;
  value: number;
}

export interface DashboardPayload {
  constants: Constants;
  totals: Totals;
  categories: Category[];
  movers: Movers;
  holdings: HoldingSummary[];
  dividendTimeline: TimelinePoint[];
  dividendHistory: DividendHistory;
  forwardPayments: ForwardMonth[];
  paymentCount: number;
  /** Payer breakdown per calendar month name, e.g. schedules.Sep */
  schedules: Record<string, ScheduleRow[]>;
  projection: Projection;
}

type Fetch = typeof globalThis.fetch;

export interface CategoryEditorPayload {
  constants: Constants;
  totals: Totals;
  categories: Category[];
  holdings: Holding[];
  targetTotal: number;
  model: CategoryModel;
}

async function post<T>(fetchFn: Fetch, path: string, body: unknown): Promise<T> {
  const res = await fetchFn(`${BASE}${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`API ${path} responded ${res.status}`);
  return await res.json() as T;
}

async function get<T>(fetchFn: Fetch, path: string): Promise<T> {
  const res = await fetchFn(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API ${path} responded ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface HoldingsScreenPayload {
  constants: Constants;
  totals: Totals;
  /** Includes sold positions; the table's "show sold" toggle filters client-side. */
  holdings: Holding[];
}

export interface TransactionsScreenPayload {
  remainingShares: Record<string, number>;
  assets: Array<{ ticker: string; name: string; shares: number; currency: string }>;
  cashBalance: number;
  constants: Constants;
  totals: Totals;
  rows: LedgerRow[];
  ledgerTotals: { buy: number; sell: number; income: number; fee: number; tax: number; count: number };
  reconciliation: Array<{
    ticker: string;
    sharesDelta: number;
    costDelta: number;
    incomeDelta: number;
    splitAdjusted: boolean;
    basisAdjust: number;
  }>;
  instrumentCount: number;
  prices: Record<string, { price: number; soldCost: number | null; status: string }>;
}

export interface CorporateActionLogEntry {
  id: string;
  date: string;
  type: string;
  status: string;
  ticker: string;
  displayTicker: string;
  name: string;
  mono: string;
  assetClass: string;
  headline: string;
  detail: string;
  ratio: number;
  ratioLabel: string | null;
  sharesBefore: number;
  sharesAfter: number;
  sharesChanged: boolean;
  basisBefore: number;
  basisAfter: number;
  basisChanged: boolean;
  basisAdjust: number;
  perShareBefore: number;
  perShareAfter: number;
  cash: number;
  pending: boolean;
}

export interface CorporateActionsScreenPayload {
  constants: Constants;
  totals: Totals;
  log: CorporateActionLogEntry[];
  stats: {
    count: number;
    completed: number;
    pending: number;
    tickers: string[];
    types: Array<{ type: string; count: number }>;
    basisReduced: number;
    cash: number;
  };
  reconciliation: TransactionsScreenPayload['reconciliation'];
}

export interface DividendCalendarPayload {
  constants: Constants;
  totals: Totals;
  month: CalendarMonth;
  year: CalendarMonth[];
  paymentCount: number;
  payerCount: number;
}

export interface GoalScenario {
  name: string;
  self: boolean;
  expectedReturn: number;
  crossPYear: number | null;
  yearsToGoal: number | null;
  endValue: number;
  byYear: number;
}

export interface GoalScreenPayload {
  constants: Constants;
  totals: Totals;
  projection: Projection;
  scenarios: GoalScenario[];
  requiredContribution: number | null;
}

export interface ResearchSnapshot {
  dataset: import('@snowline/core').Dataset;
  catalog: import('@snowline/core').ResearchCatalog;
  preferences: import('@snowline/core').ResearchPreferences;
  goalConfig: Partial<import('@snowline/core').GoalConfig> | null;
}

export const api = {
  createTransaction: async (f: Fetch, input: import('@snowline/core').TransactionInput) => {
    const res = await f(`${BASE}/api/transactions`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input)
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(res.status < 500 ? body.error ?? 'Check the transaction details.' : 'Could not save transaction. Please try again.');
    }
    return await res.json() as LedgerRow;
  },
  researchSnapshot: (f: Fetch) => get<ResearchSnapshot>(f, '/api/research/snapshot'),
  saveResearchPreferences: (f: Fetch, patch: Partial<import('@snowline/core').ResearchPreferences>) => post<import('@snowline/core').ResearchPreferences>(f, '/api/research/preferences', patch),
  goalScreen: (f: Fetch) => get<GoalScreenPayload>(f, '/api/screens/goal'),
  dividendCalendar: (f: Fetch, offset = 0, windowOffset = 0) =>
    get<DividendCalendarPayload>(
      f,
      `/api/screens/dividend-calendar?offset=${offset}&windowOffset=${windowOffset}`
    ),
  corporateActionsScreen: (f: Fetch) =>
    get<CorporateActionsScreenPayload>(f, '/api/screens/corporate-actions'),
  transactionsScreen: (f: Fetch) => get<TransactionsScreenPayload>(f, '/api/screens/transactions'),
  holdingsScreen: (f: Fetch) => get<HoldingsScreenPayload>(f, '/api/screens/holdings'),
  categoryEditor: (f: Fetch) => get<CategoryEditorPayload>(f, '/api/categories/editor'),
  editCategories: (f: Fetch, edit: CategoryEdit) => post<CategoryModel>(f, '/api/categories/edit', edit),
  dashboard: (f: Fetch) => get<DashboardPayload>(f, '/api/dashboard'),
  categories: (f: Fetch) => get<Category[]>(f, '/api/categories'),
  movers: (f: Fetch) => get<Movers>(f, '/api/movers'),
  projection: (f: Fetch) => get<Projection>(f, '/api/goal/projection')
};
