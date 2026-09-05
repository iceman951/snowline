/** Typed access to the Elysia API. Called from `load`, never from a component. */

import type {
  Category,
  CategoryEdit,
  CategoryModel,
  Constants,
  DividendHistory,
  ForwardMonth,
  Holding,
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

export const api = {
  holdingsScreen: (f: Fetch) => get<HoldingsScreenPayload>(f, '/api/screens/holdings'),
  categoryEditor: (f: Fetch) => get<CategoryEditorPayload>(f, '/api/categories/editor'),
  editCategories: (f: Fetch, edit: CategoryEdit) => post<CategoryModel>(f, '/api/categories/edit', edit),
  dashboard: (f: Fetch) => get<DashboardPayload>(f, '/api/dashboard'),
  categories: (f: Fetch) => get<Category[]>(f, '/api/categories'),
  movers: (f: Fetch) => get<Movers>(f, '/api/movers'),
  projection: (f: Fetch) => get<Projection>(f, '/api/goal/projection')
};
