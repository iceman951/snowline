/**
 * Seeds SQLite from seed-data.json — the raw facts lifted straight out of the
 * design bundle's snowline-data.js, so the POC's numbers are the prototype's
 * numbers. Idempotent: re-running replaces the stored facts and leaves the
 * user's own overrides (category model, goal config) alone.
 */

import { getDb } from './index.js';
import seed from './seed-data.json' with { type: 'json' };

interface SeedPosition {
  ticker: string; name: string; mono: string; status: string;
  shares: number; costTotal: number; costPerShare: number; value: number; price: number;
  yieldPct: number; frequency: string; sector: string; assetClass: string;
  currency: string; fxToUsd: number; dayChangePct: number; dayChangeAbs: number;
  dividendsReceived: number; realizedPnL: number; realizedDate?: string;
  irr: number; dividendGrowth5Y: number | null; payoutRatio: number | null;
  nextExDate: string | null; nextPayDate: string | null; caveat: string | null;
  soldDate?: string; soldProceeds?: number; soldCost?: number; soldShares?: number;
  region?: string; country?: string;
}

export function runSeed(): void {
  const db = getDb();

  db.transaction(() => {
    db.run('DELETE FROM positions');
    db.run('DELETE FROM dividend_history');
    db.run('DELETE FROM category_targets');

    const insertPosition = db.prepare(`
      INSERT INTO positions (
        ticker, name, mono, status, shares, cost_total, cost_per_share, value, price,
        yield_pct, frequency, sector, asset_class, currency, fx_to_usd,
        day_change_pct, day_change_abs, dividends_received, realized_pnl, realized_date,
        irr, dividend_growth_5y, payout_ratio, next_ex_date, next_pay_date, caveat,
        sold_date, sold_proceeds, sold_cost, sold_shares, sort_order
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15,
        ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30, ?31
      )
    `);

    (seed.positions as SeedPosition[]).forEach((p, i) => {
      insertPosition.run(
        p.ticker, p.name, p.mono, p.status,
        p.shares, p.costTotal, p.costPerShare, p.value, p.price,
        p.yieldPct, p.frequency, p.sector, p.assetClass, p.currency, p.fxToUsd,
        p.dayChangePct, p.dayChangeAbs, p.dividendsReceived, p.realizedPnL, p.realizedDate ?? null,
        p.irr, p.dividendGrowth5Y, p.payoutRatio, p.nextExDate, p.nextPayDate, p.caveat,
        p.soldDate ?? null, p.soldProceeds ?? null, p.soldCost ?? null, p.soldShares ?? null,
        i
      );
    });

    const k = seed.constants as any;
    db.run(
      `INSERT INTO constants (
        id, portfolio_name, base_currency, withholding_tax, irr_all_time, irr_current_holdings,
        irr_holdings_table, twr, benchmark, benchmark_twr, pe_ratio, beta, sharpe, sortino,
        income_growth_yoy, today_year, today_month_index, today_label,
        goal_amount, goal_by_year, goal_monthly_contribution,
        goal_portfolio_return, goal_safe_return, goal_reinvest_dividends
      ) VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)
      ON CONFLICT(id) DO UPDATE SET
        portfolio_name = excluded.portfolio_name, base_currency = excluded.base_currency,
        withholding_tax = excluded.withholding_tax, irr_all_time = excluded.irr_all_time,
        irr_current_holdings = excluded.irr_current_holdings, irr_holdings_table = excluded.irr_holdings_table,
        twr = excluded.twr, benchmark = excluded.benchmark, benchmark_twr = excluded.benchmark_twr,
        pe_ratio = excluded.pe_ratio, beta = excluded.beta, sharpe = excluded.sharpe,
        sortino = excluded.sortino, income_growth_yoy = excluded.income_growth_yoy,
        today_year = excluded.today_year, today_month_index = excluded.today_month_index,
        today_label = excluded.today_label, goal_amount = excluded.goal_amount,
        goal_by_year = excluded.goal_by_year, goal_monthly_contribution = excluded.goal_monthly_contribution,
        goal_portfolio_return = excluded.goal_portfolio_return, goal_safe_return = excluded.goal_safe_return,
        goal_reinvest_dividends = excluded.goal_reinvest_dividends`,
      [
        k.portfolioName, k.baseCurrency, k.withholdingTax, k.irrAllTime, k.irrCurrentHoldings,
        k.irrHoldingsTable, k.twr, k.benchmark, k.benchmarkTwr, k.peRatio, k.beta, k.sharpe, k.sortino,
        k.incomeGrowthYoY, k.today.year, k.today.monthIndex, k.today.label,
        k.goal.amount, k.goal.byYear, k.goal.monthlyContribution,
        k.goal.portfolioReturn, k.goal.safeReturn, k.goal.reinvestDividends ? 1 : 0
      ]
    );

    const insertDividend = db.prepare(
      'INSERT INTO dividend_history (year, month_index, amount) VALUES (?1, ?2, ?3)'
    );
    for (const [year, months] of Object.entries(seed.dividendHistory as Record<string, number[]>)) {
      months.forEach((amount, monthIndex) => insertDividend.run(Number(year), monthIndex, amount));
    }

    const insertCategory = db.prepare(
      'INSERT INTO category_targets (name, target_pct, sort_order) VALUES (?1, ?2, ?3)'
    );
    Object.entries(seed.categoryTargets as Record<string, number>).forEach(([name, pct], i) =>
      insertCategory.run(name, pct, i)
    );
  })();
}

if (import.meta.main) {
  runSeed();
  const db = getDb();
  const { n } = db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM positions').get()!;
  const { d } = db.query<{ d: number }, []>('SELECT COUNT(*) AS d FROM dividend_history').get()!;
  console.log(`Seeded ${n} positions, ${d} dividend months.`);
}
