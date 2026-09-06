/**
 * SQLite access. Reads the stored facts back into the shape @snowline/core
 * derives from, and writes the two things a screen may change (the category
 * model and the goal config).
 */

import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  CategoryModel,
  Constants,
  CorporateAction,
  Dataset,
  DividendHistory,
  GoalConfig,
  LedgerRow,
  Position
} from '@snowline/core';

const here = dirname(fileURLToPath(import.meta.url));

export const DB_PATH = process.env.SNOWLINE_DB ?? join(here, '../../snowline.sqlite');

let db: Database | null = null;

export function getDb(): Database {
  if (db) return db;
  db = new Database(DB_PATH, { create: true });
  db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));
  return db;
}

/** Test seam: point the module at an in-memory database. */
export function useDatabase(next: Database): Database {
  db = next;
  db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));
  return db;
}

interface PositionRow {
  ticker: string; name: string; mono: string; status: string;
  shares: number; cost_total: number; cost_per_share: number; value: number; price: number;
  yield_pct: number; frequency: string; sector: string; asset_class: string;
  currency: string; fx_to_usd: number; day_change_pct: number; day_change_abs: number;
  dividends_received: number; realized_pnl: number; realized_date: string | null;
  irr: number; dividend_growth_5y: number | null; payout_ratio: number | null;
  next_ex_date: string | null; next_pay_date: string | null; caveat: string | null;
  sold_date: string | null; sold_proceeds: number | null; sold_cost: number | null; sold_shares: number | null;
}

function toPosition(r: PositionRow): Position {
  return {
    ticker: r.ticker,
    name: r.name,
    mono: r.mono,
    status: r.status as Position['status'],
    shares: r.shares,
    costTotal: r.cost_total,
    costPerShare: r.cost_per_share,
    value: r.value,
    price: r.price,
    yieldPct: r.yield_pct,
    frequency: r.frequency as Position['frequency'],
    sector: r.sector,
    assetClass: r.asset_class as Position['assetClass'],
    currency: r.currency,
    fxToUsd: r.fx_to_usd,
    dayChangePct: r.day_change_pct,
    dayChangeAbs: r.day_change_abs,
    dividendsReceived: r.dividends_received,
    realizedPnL: r.realized_pnl,
    realizedDate: r.realized_date,
    irr: r.irr,
    dividendGrowth5Y: r.dividend_growth_5y,
    payoutRatio: r.payout_ratio,
    nextExDate: r.next_ex_date,
    nextPayDate: r.next_pay_date,
    caveat: r.caveat,
    soldDate: r.sold_date,
    soldProceeds: r.sold_proceeds,
    soldCost: r.sold_cost,
    soldShares: r.sold_shares
  };
}

export function loadDataset(): Dataset {
  const d = getDb();

  const positions = d
    .query<PositionRow, []>('SELECT * FROM positions ORDER BY sort_order')
    .all()
    .map(toPosition);

  const c = d.query<Record<string, any>, []>('SELECT * FROM constants WHERE id = 1').get();
  if (!c) throw new Error('constants row missing — run `bun run seed`');

  const constants: Constants = {
    portfolioName: c.portfolio_name,
    baseCurrency: c.base_currency,
    withholdingTax: c.withholding_tax,
    irrAllTime: c.irr_all_time,
    irrCurrentHoldings: c.irr_current_holdings,
    irrHoldingsTable: c.irr_holdings_table,
    twr: c.twr,
    benchmark: c.benchmark,
    benchmarkTwr: c.benchmark_twr,
    peRatio: c.pe_ratio,
    beta: c.beta,
    sharpe: c.sharpe,
    sortino: c.sortino,
    incomeGrowthYoY: c.income_growth_yoy,
    today: { year: c.today_year, monthIndex: c.today_month_index, label: c.today_label },
    goal: {
      amount: c.goal_amount,
      byYear: c.goal_by_year,
      monthlyContribution: c.goal_monthly_contribution,
      portfolioReturn: c.goal_portfolio_return,
      safeReturn: c.goal_safe_return,
      reinvestDividends: !!c.goal_reinvest_dividends
    }
  };

  const dividendHistory: DividendHistory = {};
  for (const row of d
    .query<{ year: number; month_index: number; amount: number }, []>(
      'SELECT year, month_index, amount FROM dividend_history ORDER BY year, month_index'
    )
    .all()) {
    (dividendHistory[row.year] ??= [])[row.month_index] = row.amount;
  }

  const categoryTargets: Record<string, number> = {};
  for (const row of d
    .query<{ name: string; target_pct: number }, []>(
      'SELECT name, target_pct FROM category_targets ORDER BY sort_order'
    )
    .all()) {
    categoryTargets[row.name] = row.target_pct;
  }

  const corporateActions: CorporateAction[] = d
    .query<Record<string, any>, []>('SELECT * FROM corporate_actions ORDER BY sort_order')
    .all()
    .map((r) => ({
      id: r.id,
      date: r.date,
      type: r.type,
      ticker: r.ticker,
      headline: r.headline,
      detail: r.detail,
      ratio: r.ratio,
      ratioLabel: r.ratio_label,
      basisAdjust: r.basis_adjust,
      status: r.status,
      cash: r.cash,
      fromTicker: r.from_ticker
    }));

  return {
    positions,
    constants,
    dividendHistory,
    categoryTargets,
    corporateActions,
    transactions: loadTransactions(),
    categoryModel: loadCategoryModel()
  };
}

export function loadTransactions(): LedgerRow[] {
  return getDb().query<{ row_json: string }, []>('SELECT row_json FROM transactions ORDER BY rowid')
    .all().map(row => JSON.parse(row.row_json) as LedgerRow);
}

export function saveTransaction(row: LedgerRow): void {
  getDb().run('INSERT INTO transactions (id, row_json) VALUES (?, ?)', [row.id, JSON.stringify(row)]);
}

export function loadCategoryModel(): CategoryModel | null {
  const row = getDb()
    .query<{ model_json: string }, []>('SELECT model_json FROM category_overrides WHERE id = 1')
    .get();
  if (!row) return null;
  try {
    return JSON.parse(row.model_json) as CategoryModel;
  } catch {
    return null;
  }
}

export function saveCategoryModel(model: CategoryModel): void {
  getDb().run(
    'INSERT INTO category_overrides (id, model_json) VALUES (1, ?) ' +
      'ON CONFLICT(id) DO UPDATE SET model_json = excluded.model_json',
    [JSON.stringify(model)]
  );
}

export function clearCategoryModel(): void {
  getDb().run('DELETE FROM category_overrides WHERE id = 1');
}

export function loadGoalConfig(): Partial<GoalConfig> | null {
  const row = getDb()
    .query<{ config_json: string }, []>('SELECT config_json FROM goal_config WHERE id = 1')
    .get();
  if (!row) return null;
  try {
    return JSON.parse(row.config_json) as Partial<GoalConfig>;
  } catch {
    return null;
  }
}

export function saveGoalConfig(cfg: Partial<GoalConfig>): void {
  getDb().run(
    'INSERT INTO goal_config (id, config_json) VALUES (1, ?) ' +
      'ON CONFLICT(id) DO UPDATE SET config_json = excluded.config_json',
    [JSON.stringify(cfg)]
  );
}

export function clearGoalConfig(): void {
  getDb().run('DELETE FROM goal_config WHERE id = 1');
}

export function loadResearchCatalog(): import('@snowline/core').ResearchCatalog {
  const row = getDb().query<{ catalog_json: string }, []>('SELECT catalog_json FROM research_catalog WHERE id = 1').get();
  if (!row) throw new Error('research catalog missing — run `bun run seed`');
  return JSON.parse(row.catalog_json);
}

export function loadResearchPreferences(): import('@snowline/core').ResearchPreferences {
  const row = getDb().query<{ preferences_json: string }, []>('SELECT preferences_json FROM research_preferences WHERE id = 1').get();
  return row ? JSON.parse(row.preferences_json) : { watchlist: ['O', 'MSFT', 'TXN', 'SPG', 'LIN'], scenarios: null };
}

export function saveResearchPreferences(patch: Partial<import('@snowline/core').ResearchPreferences>): import('@snowline/core').ResearchPreferences {
  const value = { ...loadResearchPreferences(), ...patch };
  getDb().run('INSERT INTO research_preferences (id, preferences_json) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET preferences_json = excluded.preferences_json', [JSON.stringify(value)]);
  return value;
}
