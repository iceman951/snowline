/** Typed access to the Elysia API. Called from `load`, never from a component. */

import type {
  Category,
  Constants,
  DividendHistory,
  ForwardMonth,
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

async function get<T>(fetchFn: Fetch, path: string): Promise<T> {
  const res = await fetchFn(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API ${path} responded ${res.status}`);
  }
  return (await res.json()) as T;
}

export const api = {
  dashboard: (f: Fetch) => get<DashboardPayload>(f, '/api/dashboard'),
  categories: (f: Fetch) => get<Category[]>(f, '/api/categories'),
  movers: (f: Fetch) => get<Movers>(f, '/api/movers'),
  projection: (f: Fetch) => get<Projection>(f, '/api/goal/projection')
};
