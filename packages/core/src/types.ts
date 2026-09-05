/**
 * Domain types for Snowline.
 *
 * `Position` mirrors the hand-entered facts in the design bundle's
 * snowline-data.js — they are the only portfolio facts stored. Everything a
 * screen renders is derived from these plus `Constants` and `DividendHistory`.
 */

export type PositionStatus = 'open' | 'sold';
export type Frequency = 'Monthly' | 'Quarterly';
export type AssetClass = 'Stock' | 'ETF' | 'ETN' | 'Cash';

export interface Position {
  ticker: string;
  name: string;
  mono: string;
  status: PositionStatus;
  shares: number;
  costTotal: number;
  costPerShare: number;
  value: number;
  price: number;
  yieldPct: number;
  frequency: Frequency;
  sector: string;
  assetClass: AssetClass;
  currency: string;
  fxToUsd: number;
  dayChangePct: number;
  dayChangeAbs: number;
  dividendsReceived: number;
  realizedPnL: number;
  realizedDate: string | null;
  irr: number;
  dividendGrowth5Y: number | null;
  payoutRatio: number | null;
  nextExDate: string | null;
  nextPayDate: string | null;
  caveat: string | null;
  soldDate: string | null;
  soldProceeds: number | null;
  soldCost: number | null;
  soldShares: number | null;
}

export interface GoalConstants {
  amount: number;
  byYear: number;
  monthlyContribution: number;
  portfolioReturn: number;
  safeReturn: number;
  reinvestDividends: boolean;
}

export interface Constants {
  portfolioName: string;
  baseCurrency: string;
  withholdingTax: number;
  irrAllTime: number;
  irrCurrentHoldings: number;
  irrHoldingsTable: number;
  twr: number;
  benchmark: string;
  benchmarkTwr: number;
  peRatio: number;
  beta: number;
  sharpe: number;
  sortino: number;
  incomeGrowthYoY: number;
  today: { year: number; monthIndex: number; label: string };
  goal: GoalConstants;
}

/** Dividends actually received, net of withholding, by calendar month. */
export type DividendHistory = Record<number, number[]>;

/** A category bucket: which holdings sit in it, its target weight, its order. */
export interface CategoryModel {
  order: string[];
  targets: Record<string, number>;
  assign: Record<string, string>;
}

/** Everything a derivation needs. One snapshot, read once per request. */
export interface Dataset {
  positions: Position[];
  constants: Constants;
  dividendHistory: DividendHistory;
  categoryTargets: Record<string, number>;
  categoryModel?: CategoryModel | null;
}

/* ---- derived shapes ----------------------------------------------------- */

export interface Totals {
  value: number;
  invested: number;
  shares: number;
  capitalGain: number;
  capitalGainPct: number;
  dayChange: number;
  dayChangePct: number;
  dividendsLifetime: number;
  dividendsReceived: number;
  dividendsTrailing12: number;
  realizedPnL: number;
  totalProfit: number;
  totalProfitPct: number;
  forwardGross: number;
  forwardNet: number;
  forwardMonthlyNet: number;
  forwardDailyNet: number;
  grossYield: number;
  netYield: number;
  yieldOnCost: number;
  holdings: number;
  soldCount: number;
  categoryCount: number;
  goalProgressPct: number;
}

export interface Category {
  name: string;
  index: number;
  count: number;
  tickers: string[];
  value: number;
  invested: number;
  gainAbs: number;
  gainPctN: number;
  income: number;
  yieldPct: number;
  allocN: number;
  targetN: number;
  driftN: number;
  targetValue: number;
  deltaValue: number;
}

export interface Movers {
  gainers: Position[];
  losers: Position[];
  gainSum: number;
  lossSum: number;
}

export interface TimelinePoint {
  label: string;
  year: string;
  v: number;
}

export type PaymentStatus = 'Paid' | 'Declared' | 'Estimated';

export interface ScheduleRow {
  t: string;
  amt: number;
}

export interface ForwardMonth {
  m: string;
  year: string;
  label: string;
  full: string;
  total: number;
  received: number;
  rows: Array<ScheduleRow & { status: PaymentStatus }>;
}

export interface GoalConfig {
  mode: 'value' | 'income';
  valueTarget: number;
  incomeTarget: number;
  byYear: number;
  monthlyContribution: number;
  contributionGrowth: number;
  expectedReturn: number;
  safeReturn: number;
  dividendGrowth: number;
  inflation: number;
  reinvestDividends: boolean;
  taxDrag: number;
  currency: string;
  target: number;
}

export interface ProjectionYear {
  n: number;
  year: number;
  isToday: boolean;
  goal: number;
  contributionYear: number;
  contributionMonthly: number;
  contributedToDate: number;
  dividends: number;
  taxes: number;
  value: number;
  income: number;
  portfolio: number;
  portfolioReal: number;
  safe: number;
  safeReal: number;
  reached: boolean;
  safeReached: boolean;
}

export interface Projection {
  cfg: GoalConfig;
  mode: 'value' | 'income';
  modeLabel: string;
  altLabel: string;
  unit: string;
  startValue: number;
  startIncome: number;
  startYield: number;
  current: number;
  target: number;
  goal: number;
  byYear: number;
  span: number;
  startYear: number;
  P: number[];
  S: number[];
  years: ProjectionYear[];
  crossP: number | null;
  crossS: number | null;
  crossPYear: number | null;
  crossSYear: number | null;
  yearsToGoal: number | null;
  achievable: boolean;
  safeAchievable: boolean;
  progressPct: number;
  endValue: number;
  endSafe: number;
  endReal: number;
  endSafeReal: number;
  shortfall: number;
  totalContributions: number;
  totalDividends: number;
  totalTaxes: number;
  rewardIncome: number;
  rewardCapital: number;
}

export interface Holding {
  p: Position;
  capitalGain: number;
  capitalGainPct: number;
  totalProfit: number;
  totalProfitPct: number;
  annualGross: number;
  annualNet: number;
  perShareGross: number;
  dividendsPerShare: number;
  yieldOnCost: number;
  shareOfPortfolio: number;
  shareOfCategory: number;
  categoryName: string;
}
