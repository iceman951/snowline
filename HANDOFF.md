# Snowline POC — handoff

Read this first. It is the contract for anyone (human or agent) picking up the work.

Last updated: 2026-09-06. Status: **Dashboard slice complete and verified.**

---

## 1. What this project is

`snowline/` is a **Claude Design handoff bundle** — an HTML/CSS/JS prototype of a
dividend-portfolio tracker. It is **acceptance criteria, not source to port**.

We are building the real app in a separate tree using **Bun + ElysiaJS + SvelteKit + SQLite**.

Ignore `snowline/README.md`'s advice about target stack. The stack is decided.

### The one rule that matters

`snowline/project/snowline-data.js` is the **single source of truth for every figure**.
It is a self-contained derivation engine: positions + constants + dividend history are the
only stored facts, and everything else (category totals, allocation %, drift, day movers,
the forward payment schedule, dividend series, goal projection, risk stats, backtests) is
DERIVED from them.

**Never invent a formula and never hardcode a figure into a screen.** If a number in the
prototype's prose disagrees with what the code computes, the computation wins. The bundle's
own header comment documents several such reconciliations.

---

## 2. What is built and verified

### `packages/core` — the derivation engine (TypeScript)

A faithful port of `snowline-data.js`. Exposed as the `Engine` class over a `Dataset`.

Ported and **parity-tested** (19 tests, 257 assertions, all passing):

| Function | What it derives |
|---|---|
| `totals()` | value, invested, capital gain, day change, lifetime dividends, realised P&L, total profit, forward gross/net income, gross/net yield, yield on cost |
| `categories(ordered?)` | per-bucket value, invested, gain, income, allocation %, target %, drift, target value, delta |
| `categoryModel()` / `categorySeed()` | the user's buckets, seeded from each holding's sector + the stored target plan |
| `movers()` | day gainers/losers with their sums |
| `holding(p)` / `holdings(includeSold?)` | per-holding gain, profit, yield on cost, share of portfolio, share of category |
| `dividendTimeline()` | received dividends by calendar month |
| `scheduleFor(month)` | gross payments due in a calendar month |
| `forwardPayments()` | forward 12 months with Paid/Declared/Estimated status |
| `paymentCountNext12()` | payment count |
| `goalConfig(patch?)` / `projection(patch?)` | the monthly-step goal projection engine |

Also `fmt` (shared formatters — money, signed, pct, caret, k, compact) in `format.ts`.

**Reconciles exactly** to the bundle's own header figures:
value `$30,374.48`, invested `$28,431.28`, capital gain `+$1,943.20`,
total profit `+$3,989.53`, lifetime dividends `$1,467.21`, realised P&L `$579.12`,
forward income `$1,590.07` at `5.23%` gross / `$1,351.56` at `4.45%` net.

### `apps/api` — Elysia on Bun with `bun:sqlite`

Schema stores only hand-entered facts (`positions`, `constants`, `dividend_history`,
`category_targets`) plus the two things a screen may change
(`category_overrides`, `goal_config`). A fresh `Engine` is built per request.

Endpoints:

```
GET    /health
GET    /api/portfolio              constants + totals
GET    /api/holdings?includeSold=  per-holding derived figures
GET    /api/holdings/:ticker
GET    /api/categories?ordered=
PUT    /api/categories/model       save the user's bucket model
GET    /api/movers
GET    /api/dividends/timeline
GET    /api/dividends/forward
GET    /api/dividends/schedule/:month
GET    /api/goal/projection
PUT    /api/goal/config
DELETE /api/goal/config
GET    /api/dashboard              composite: everything the Dashboard needs
```

### `apps/web` — SvelteKit 2 / Svelte 5 (runes)

- Design tokens in `src/app.css`, **lifted verbatim** from the prototype's `:root`
  and `html[data-theme="dark"]` blocks. Do not "improve" these values.
- Components ported 1:1 from the bundle: `TopNav`, `Metric`, `TwoLineCell`, `ChartTooltip`.
- Chart geometry helpers in `src/lib/charts.ts` (`bars`, `gridFor`, `arcPath`, `ramp`,
  `tipLeft`), ported from the prototype's maths so bars and arcs land on the same pixels.
- Dashboard (`src/routes/+page.svelte`) with all sections: KPI row (with mask toggle),
  portfolio insights (dismiss/restore), allocation donut + sortable table, quotes bar,
  "why is it moving?", day movers, future payments chart, dividends received chart
  (period / granularity / bars-vs-line), dividend growth chart, and the goal card.
- Data is loaded server-side in `+page.server.ts`; components never fetch.

**Verified rendering** at desktop and mobile breakpoints against the design.

---

## 3. How to run

```bash
bun install
bun run seed          # seeds apps/api/snowline.sqlite from the bundle's facts
bun run dev:api       # http://localhost:3001
bun run dev:web       # http://localhost:5173
```

Tests:

```bash
bun test packages/core
```

Regenerate the seed + parity reference from the bundle (only when the bundle changes):

```bash
bun run scripts/extract-reference.ts
```

That script loads `snowline-data.js` in a fake browser and dumps
`apps/api/src/db/seed-data.json` and `packages/core/test/reference.json`.
**Never hand-edit those two files.**

---

## 4. What is NOT built yet

### Screens (each maps to a `.dc.html` in `snowline/project/`)

| Route | Bundle file | Notes |
|---|---|---|
| `/analytics` | `Analytics.dc.html` | TopNav + AnalyticsSubnav + KpiRow + HoldingsTable |
| `/analytics/diversification` | `Diversification.dc.html` | needs `breakdown()`, `lookThrough()`, `fundComposition` |
| `/analytics/dividends` | `AnalyticsDividends.dc.html` | needs `incomeBreakdown()`, `dividendRating()` |
| `/analytics/growth` | `Growth.dc.html` | needs `history()`, `monthlyReturns()`, `holdingsPerformance()` |
| `/analytics/metrics` | `Metrics.dc.html` | needs `riskStats()`, `riskVerdict()`, `betaOf()`, `seriesStats()` |
| `/analytics/report` | `Report.dc.html` | |
| `/portfolio/holdings` | `Holdings.dc.html` + `HoldingsTable.dc.html` | the big table; `HoldingsTable` is 54KB |
| `/portfolio/transactions` | `Transactions.dc.html` | needs `ledger()`, `ledgerTotals()`, `ledgerReconciliation()`, `lotsFor()` |
| `/portfolio/dividend-calendar` | `DividendCalendar.dc.html` | needs `calendarMonth()`, `calendarYear()` |
| `/portfolio/goal` | `MyGoal.dc.html` | projection engine is already ported — this is UI only |
| `/portfolio/cash` | `Cash.dc.html` | needs `cashFlow()`, `cashStats()`, `cashByCurrency()` |
| `/portfolio/categories` | `Categories.dc.html` | mutations exist in the prototype; API has `PUT /api/categories/model` |
| `/portfolio/corporate-actions` | `CorporateActions.dc.html` | needs `corporateActionLog()`, `splitFactorAfter()`, `basisAdjustFor()` |
| `/tools/rebalancing` | `Rebalancing.dc.html` | |
| `/tools/screener` | `Screener.dc.html` | needs `marketUniverse()`, `universeStats()` |
| `/tools/find-the-dip` | `FindTheDip.dc.html` | needs `technicals()`, `dipRows()` |
| `/tools/payout-calendar` | `PayoutCalendar.dc.html` | needs `marketCalendarMonth()/Year()` |
| `/tools/portfolio-lab` | `PortfolioLab.dc.html` | needs `backtest()`, `labSecurities()`, `maxDrawdown()` |

Nav links to these already exist in `src/lib/nav.ts` and currently 404.
**A placeholder route has not been added** — decide whether to add one or build screens first.

### Engine functions still to port from `snowline-data.js`

Everything not in the table in §2. Grouped by the source file's own section comments:

- **dividend calendar** — `calendarMonth`, `calendarYear`, `payAnchor`, `paysInMonth` (~line 478)
- **cash** — `cashFlow`, `cashStats`, `cashByCurrency`, `cashPositions`, `cashFloat` (~line 656).
  Note: cash flow is *solved*, not stored — read the policy comment above `cashFlow()`.
- **monthly history** — `history`, `historyRange`, `monthlyReturns`, `benchmarkValuePath`,
  `holdingsPerformance`, `monthSpan`, `returnPath` (~line 913). Pinned at both ends; read the comment.
- **transaction ledger** — `ledger`, `ledgerTotals`, `ledgerReconciliation`, `lotsFor`,
  `incomeRowsFor`, `transactionsFor`, `dividendsFor`, `exchangesFor`, `tradeFee` (~line 1106)
- **corporate actions** — `corporateActionsFor`, `splitFactorAfter`, `basisAdjustFor`,
  `corporateActionLog`, `corporateActionStats` (~line 1122)
- **market universe** — `marketUniverse`, `universeSectors`, `universeStats`,
  `marketCalendarMonth`, `marketCalendarYear` (~line 1501)
- **fund look-through** — `fundComposition`, `lookThrough`, `breakdown`, `incomeBreakdown`,
  `dividendRating` (~line 1741)
- **risk statistics** — `riskFreeRate`, `seriesStats`, `betaOf`, `riskCalibration`,
  `riskStats`, `riskVerdict` (~line 1856)
- **backtest engine** — `labSecurities`, `labSecurity`, `labAnchor`, `dampen`, `labReturns`,
  `maxDrawdown`, `labMyPortfolio`, `backtest`, `labScenarios` (Portfolio Lab)
- **price technicals** — `sessionDate`, `technicals`, `dipRows` (Find the Dip)
- **watchlist** — `watchlist`, `saveWatchlist`, `toggleWatch`
- **deterministic detail data** — `seeded`, `priceSeries` (seeded PRNG per ticker)

Several of these use a **seeded PRNG** (`seeded(s)`) so the prototype's "random" detail data
is deterministic. Port the PRNG exactly or the numbers will not match.

Also not yet stored in SQLite: `corporateActions`, `fundComposition`, the market universe,
and the watchlist. Extend `schema.sql` + `seed.ts` when the screens that need them are built.

---

## 5. Conventions to follow

1. **Port, don't invent.** Every derived figure comes from `packages/core`. If the bundle
   hardcodes something (the quotes bar, the "why is it moving?" copy), keep it and mark it
   with a comment saying it needs a real source.
2. **Extend the parity test.** Add each newly ported function to
   `scripts/extract-reference.ts` (dump its output) and `packages/core/test/parity.test.ts`
   (assert the port matches). This is what makes the port trustworthy.
3. **Design tokens are law.** Use the CSS variables. No new colours, no new spacing scale.
4. **Server-side load.** Data is fetched in `+page.server.ts` via `$lib/api`; components
   receive props. Components never call `fetch`.
5. **Svelte 5 runes** — `$props()`, `$state()`, `$derived()`, `$derived.by()`, `$effect()`.
6. **Comments explain *why*.** The prototype's own comments are excellent; carry the
   reasoning over when you port a function, don't just copy the arithmetic.
7. `bun test packages/core` must stay green.

---

## 6. Known gaps and decisions still open

These were flagged but not resolved. They need a product decision before the affected
screens can be built correctly:

- **Cost basis method** — FIFO vs average cost. Affects realised P&L, lot display
  (`lotsFor`), and corporate-action basis adjustment.
- **Dividend recognition** — ex-date vs pay-date. Affects which month a payment lands in
  on the calendar and the received series.
- **FX locking convention** — every position is currently `USD` with `fxToUsd: 1`, so this
  is untested. `cashByCurrency()` and any non-USD holding will expose it.
- **TWR sub-period timing** — `constants.twr` is a stored constant, not derived. The
  Growth/Metrics screens may need it computed.
- **Spin-off cost allocation** — relevant to `corporateActions`.
- **Quotes feed** — the quotes bar is hardcoded in both the prototype and our port. There
  is no quote source in the data model.
- **`irrHoldingsTable`, `irrAllTime`, `irrCurrentHoldings`, `beta`, `sharpe`, `sortino`,
  `peRatio`** are stored constants in the prototype, not derived. Decide whether the real
  app computes them or keeps storing them.

---

## 7. File map

```
snowline/                       the design bundle — READ ONLY, acceptance criteria
  project/*.dc.html             screens and components
  project/snowline-data.js      the derivation engine (source of truth for figures)
  project/uploads/*.md          original briefs and specs

packages/core/
  src/types.ts                  domain + derived types
  src/derive.ts                 the Engine
  src/format.ts                 shared formatters
  test/parity.test.ts           pins the port to the prototype
  test/reference.json           generated — do not hand-edit

apps/api/
  src/index.ts                  Elysia routes
  src/db/schema.sql             SQLite schema
  src/db/index.ts               load/save
  src/db/seed.ts                seeder
  src/db/seed-data.json         generated — do not hand-edit

apps/web/
  src/app.css                   design tokens
  src/lib/api.ts                typed API client
  src/lib/charts.ts             SVG geometry helpers
  src/lib/nav.ts                route map + icons
  src/lib/components/           TopNav, Metric, TwoLineCell, ChartTooltip
  src/lib/components/dashboard/ the Dashboard's cards
  src/routes/+page.svelte       Dashboard

scripts/extract-reference.ts    regenerates seed + parity reference from the bundle
```

---

## 8. Suggested next step

Build `/portfolio/holdings` next. It is the highest-value remaining screen, the engine
functions it needs (`holdings()`, `categories()`) are **already ported and tested**, and
`HoldingsTable.dc.html` is reused by `/analytics` — so one build unlocks two routes.
