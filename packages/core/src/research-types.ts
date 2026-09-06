/** Hand-entered catalog facts and user-owned research settings. */
export interface ResearchCatalog {
  universe: Array<Array<string | number | null>>;
  heldMeta: Record<string, number[]>;
  fundComposition: Record<string, Array<{ t: string; n: string; s: string; w: number }>>;
  geography: Record<string, string[]>;
}

export interface LabScenario {
  name: string;
  weights: Array<{ ticker: string; weight: number }>;
  amount: number;
  monthly: number;
  reinvest: boolean;
  from?: number;
  to?: number;
}

export interface ResearchPreferences {
  watchlist: string[];
  scenarios: LabScenario[] | null;
}

export const WATCHLIST_SEED = ['O', 'MSFT', 'TXN', 'SPG', 'LIN'];

export type UniverseFact = [string, string, string, string, import('./types.js').AssetClass, number, number, number | null, number | null, number, number, import('./types.js').Frequency, number, number, number];
export interface DividendRating { score: number | null; label: string; warn: boolean; reasons: string[] }
export type RatingInput = Pick<import('./types.js').Position, 'yieldPct' | 'payoutRatio' | 'dividendGrowth5Y' | 'assetClass' | 'frequency'>;
export interface MarketRow extends RatingInput {
  ticker: string; name: string; mono: string; sector: string;
  price: number; dps: number; streak: number; capB: number;
  exDay: number; payDay: number; cycle: number;
  held: boolean; closed: boolean; shares: number;
  position?: import('./types.js').Position; soldDate?: string | null;
  rating: DividendRating; perPayment: number; paymentsAYear: number; isFund: boolean;
}
export interface MarketEvent {
  ticker: string; name: string; mono: string; sector: string; frequency: string;
  yieldPct: number; held: boolean; closed: boolean; rating: DividendRating; price: number;
  day: number; exDay: number; payDay: number; exDate: string; payDate: string;
  perShare: number; status: string;
}
export interface Exposure {
  label: string; subLabel: string; value: number; sector: string;
  assetClass: string; currency: string; region: string; country: string;
  via: string | null; partial?: number;
}
export type ExposureDimension = 'holdings' | 'sector' | 'assetClass' | 'currency' | 'region' | 'country';
export interface Breakdown { name: string; subLabel: string; value: number; count: number; via: string[]; pct: number }
export interface SeriesStats { mean: number; sd: number; vol: number; sharpe: number; sortino: number; total: number; downMonths?: number }
export interface RiskCalibration { rf: number; sharpe: number; sortino: number; beta: number }
export interface BacktestPoint {
  key: string; short: string; year?: number; monthIndex?: number; isStart: boolean;
  value: number; invested: number; benchmark: number; twrIndex: number; benchmarkIndex: number;
  monthReturn: number; benchmarkReturn: number; dividends: number; dividendsToDate: number; cash: number;
}
export interface Technicals {
  sessions: number; series: number[]; price: number; high: number; low: number;
  highDate: string; lowDate: string; highSessionsAgo: number; lowSessionsAgo: number;
  ma50: number; ma200: number; fromHigh: number; fromLow: number; from50: number; from200: number;
  rangePos: number; trendUp: boolean; maSpread: number; anchorSource: string; anchorAnnual: number;
  consistent?: boolean;
}
