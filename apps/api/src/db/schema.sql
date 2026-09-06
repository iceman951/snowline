-- Snowline storage.
--
-- Only hand-entered facts live here. Category totals, allocation, drift,
-- movers, the payment schedule and the goal projection are derived at read
-- time by @snowline/core — never stored, so they cannot drift out of step.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Append-only user entries; the opening positions and generated lots stay intact.
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  row_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS positions (
  ticker            TEXT PRIMARY KEY,
  name              TEXT    NOT NULL,
  mono              TEXT    NOT NULL,
  status            TEXT    NOT NULL CHECK (status IN ('open', 'sold')),
  shares            REAL    NOT NULL DEFAULT 0,
  cost_total        REAL    NOT NULL DEFAULT 0,
  cost_per_share    REAL    NOT NULL DEFAULT 0,
  value             REAL    NOT NULL DEFAULT 0,
  price             REAL    NOT NULL DEFAULT 0,
  yield_pct         REAL    NOT NULL DEFAULT 0,
  frequency         TEXT    NOT NULL,
  sector            TEXT    NOT NULL,
  asset_class       TEXT    NOT NULL,
  currency          TEXT    NOT NULL DEFAULT 'USD',
  fx_to_usd         REAL    NOT NULL DEFAULT 1,
  day_change_pct    REAL    NOT NULL DEFAULT 0,
  day_change_abs    REAL    NOT NULL DEFAULT 0,
  dividends_received REAL   NOT NULL DEFAULT 0,
  realized_pnl      REAL    NOT NULL DEFAULT 0,
  realized_date     TEXT,
  irr               REAL    NOT NULL DEFAULT 0,
  dividend_growth_5y REAL,
  payout_ratio      REAL,
  next_ex_date      TEXT,
  next_pay_date     TEXT,
  caveat            TEXT,
  sold_date         TEXT,
  sold_proceeds     REAL,
  sold_cost         REAL,
  sold_shares       REAL,
  sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_positions_status ON positions (status);

-- Portfolio-level facts that cannot be computed from positions.
-- Single row, guarded by the id CHECK.
CREATE TABLE IF NOT EXISTS constants (
  id                    INTEGER PRIMARY KEY CHECK (id = 1),
  portfolio_name        TEXT    NOT NULL,
  base_currency         TEXT    NOT NULL,
  withholding_tax       REAL    NOT NULL,
  irr_all_time          REAL    NOT NULL,
  irr_current_holdings  REAL    NOT NULL,
  irr_holdings_table    REAL    NOT NULL,
  twr                   REAL    NOT NULL,
  benchmark             TEXT    NOT NULL,
  benchmark_twr         REAL    NOT NULL,
  pe_ratio              REAL    NOT NULL,
  beta                  REAL    NOT NULL,
  sharpe                REAL    NOT NULL,
  sortino               REAL    NOT NULL,
  income_growth_yoy     REAL    NOT NULL,
  today_year            INTEGER NOT NULL,
  today_month_index     INTEGER NOT NULL,
  today_label           TEXT    NOT NULL,
  goal_amount           REAL    NOT NULL,
  goal_by_year          INTEGER NOT NULL,
  goal_monthly_contribution REAL NOT NULL,
  goal_portfolio_return REAL    NOT NULL,
  goal_safe_return      REAL    NOT NULL,
  goal_reinvest_dividends INTEGER NOT NULL
);

-- Dividends actually received, net of withholding, by calendar month.
CREATE TABLE IF NOT EXISTS dividend_history (
  year        INTEGER NOT NULL,
  month_index INTEGER NOT NULL CHECK (month_index BETWEEN 0 AND 11),
  amount      REAL    NOT NULL,
  PRIMARY KEY (year, month_index)
);

-- The user's own buckets: seed target weights. The live model (assignment,
-- targets, order) is derived from these plus each holding's sector.
CREATE TABLE IF NOT EXISTS category_targets (
  name       TEXT PRIMARY KEY,
  target_pct REAL    NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- User overrides of the seeded category model, written by the Categories
-- screen. NULL/absent row means "use the seed".
CREATE TABLE IF NOT EXISTS category_overrides (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  model_json TEXT NOT NULL
);

-- Events that changed a position without being a trade. Splits and returns of
-- capital move real numbers; the rest are numerically neutral. The ledger is
-- generated against these, so they must be stored, not derived.
CREATE TABLE IF NOT EXISTS corporate_actions (
  id           TEXT PRIMARY KEY,
  date         TEXT    NOT NULL,
  type         TEXT    NOT NULL,
  ticker       TEXT    NOT NULL REFERENCES positions (ticker),
  headline     TEXT    NOT NULL,
  detail       TEXT    NOT NULL,
  -- Share ratio: 4 = 4-for-1 forward split, 0.25 = 1-for-4 reverse, 1 = neutral.
  ratio        REAL    NOT NULL DEFAULT 1,
  ratio_label  TEXT,
  -- Cost-basis reduction booked by a return of capital.
  basis_adjust REAL    NOT NULL DEFAULT 0,
  status       TEXT    NOT NULL CHECK (status IN ('Completed', 'Announced')),
  cash         REAL    NOT NULL DEFAULT 0,
  from_ticker  TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_corporate_actions_ticker ON corporate_actions (ticker);

-- Saved goal settings, written by the My goal screen.
CREATE TABLE IF NOT EXISTS goal_config (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  config_json TEXT NOT NULL
);

-- Illustrative market facts from the handoff, kept separate from positions.
CREATE TABLE IF NOT EXISTS research_catalog (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  catalog_json TEXT NOT NULL
);

-- One portfolio's watchlist and saved backtest configurations.
CREATE TABLE IF NOT EXISTS research_preferences (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  preferences_json TEXT NOT NULL
);
