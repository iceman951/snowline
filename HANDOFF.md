# Snowline POC — handoff

Read this first. It is the contract for anyone (human or agent) picking up the work.

Last updated: 2026-09-06. Status: **all 19 screens complete and verified.**

Built: Dashboard, Holdings, Categories, Transactions, Corporate actions, Dividend
calendar, Cash, My goal, Analytics (Common, Diversification, Dividends, Growth,
Metrics, Report) and Tools (Rebalancing, Screener, Find the Dip, Payout calendar,
Portfolio Lab). Every function in `snowline-data.js`'s public API is ported and
parity-tested. What remains is listed in §4 and §6.

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
| `requiredContribution(cfg)` | smallest monthly contribution that reaches the goal (bisection) |
| `calendarMonth(y, mi)` / `calendarYear(y, mi)` | day-level dividend events, with Paid/Declared/Estimated status |
| `dividendsFor(ticker, n)` | a holding's recent payments |
| `exchangesFor(ticker)` | cross-listings for the ticker combobox |
| `ledger.ledger()` | every generated trade and income row |
| `ledger.lotsFor(p)` / `incomeRowsFor(p)` | the lot solver and its income rows |
| `ledger.ledgerTotals()` / `ledgerReconciliation()` | totals, and the proof rows still sum to the positions |
| `ledger.transactionsFor(ticker)` | one holding's trades |
| `ledger.corporateActionLog()` / `corporateActionStats()` | the audit trail with before/after figures |
| `ledger.splitFactorAfter()` / `basisAdjustFor()` | split chain and return-of-capital adjustments |
| `ledger.priceSeries(ticker, n)` | seeded deterministic price history |

Also `fmt` (shared formatters — money, signed, pct, caret, k, compact) in `format.ts`.

The rest of the bundle's public API lives in three further modules, all
parity-tested the same way:

| Module | What it derives |
|---|---|
| `history.ts` (`engine.history`) | `history()`, `historyRange()`, `monthSpan()`, `monthlyReturns()`, `benchmarkValuePath()`, `returnPath()`, and the *solved* `cashFlow()` walk |
| `derive.ts` (cash) | `cashStats()`, `cashByCurrency()`, `cashPositions()`, `cashFloat()`, `holdingsPerformance()` |
| `research.ts` (`createResearchEngine`) | fund look-through (`fundComposition`, `lookThrough`, `breakdown`, `incomeBreakdown`, `dividendRating`), risk (`riskFreeRate`, `seriesStats`, `betaOf`, `riskCalibration`, `riskStats`, `riskVerdict`), the market universe (`marketUniverse`, `universeSectors`, `universeStats`, `marketCalendarMonth/Year`), the backtest engine (`labSecurities`, `labSecurity`, `labAnchor`, `labReturns`, `maxDrawdown`, `labMyPortfolio`, `backtest`) and price technicals (`sessionDate`, `technicals`, `dipRows`) |
| `rebalance.ts` | `rebalance()` and its `waterFill()` allocator for the Rebalancing tool |
| `category-edits.ts` | `editCategories()` — create / rename / target / assign / delete / move / normalise / reset |

The seeded PRNG (`seeded`) and price-band helpers are in `ledger.ts` and are shared
by every module that needs the prototype's deterministic "random" detail data.

**Reconciles exactly** to the bundle's own header figures:
value `$30,374.48`, invested `$28,431.28`, capital gain `+$1,943.20`,
total profit `+$3,989.53`, lifetime dividends `$1,467.21`, realised P&L `$579.12`,
forward income `$1,590.07` at `5.23%` gross / `$1,351.56` at `4.45%` net.

### `apps/api` — Elysia on Bun with `bun:sqlite`

Schema stores only hand-entered facts (`positions`, `constants`, `dividend_history`,
`category_targets`, `corporate_actions`, `research_catalog`) plus the three things a
screen may change (`category_overrides`, `goal_config`, `research_preferences` — the
watchlist and saved Portfolio Lab scenarios). A fresh `Engine` is built per request.

Endpoints:

```
GET    /health
GET    /api/portfolio                 constants + totals
GET    /api/holdings?includeSold=     per-holding derived figures
GET    /api/holdings/:ticker
GET    /api/holdings/:ticker/detail   drawer: dividends, transactions, price series
GET    /api/categories?ordered=
GET    /api/categories/editor         everything the Categories screen needs
POST   /api/categories/edit           one CategoryEdit; 422 on invalid, 400 on bad body
PUT    /api/categories/model          save the user's bucket model
GET    /api/movers
GET    /api/dividends/timeline
GET    /api/dividends/forward
GET    /api/dividends/schedule/:month
GET    /api/ledger
GET    /api/ledger/reconciliation
GET    /api/corporate-actions
GET    /api/goal/projection
PUT    /api/goal/config
DELETE /api/goal/config
GET    /api/dashboard                 composite: everything the Dashboard needs
GET    /api/screens/goal
GET    /api/screens/dividend-calendar
GET    /api/screens/corporate-actions
GET    /api/screens/transactions
GET    /api/screens/holdings
GET    /api/research/snapshot         dataset + catalog + preferences + goal config
POST   /api/research/preferences      watchlist / lab scenarios
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
- Shared bundle components beyond the originals: `DonutBreakdown`, `NumberLineGauge`,
  `RangeTabs`, and `ResearchPage` (the shell the eleven research screens mount into).
- **The research screens use a presenter split.** Each of Cash, Rebalancing,
  Diversification, Analytics Dividends, Growth, Metrics, Report, Screener, Find the Dip,
  Payout calendar and Portfolio Lab is a pair: `src/lib/presenters/<Name>.js` holds the
  view-model maths ported from the `.dc.html`, and `src/lib/screens/<Name>.svelte` renders
  it. Presenters are plain JS and take the screen engine, so they stay testable and free
  of Svelte specifics.
- `src/lib/screen-engine.ts` builds one isolated engine per page snapshot (core `Engine` +
  research engine + `rebalance` + `fmt`) and is the *only* thing presenters read from.
  It also owns watchlist and lab-scenario writes, posting them to
  `/api/research/preferences` so they survive a reload and are shared between screens.
- `src/lib/research-actions.ts` holds the SvelteKit form actions for those writes.

**Verified rendering** at desktop and mobile breakpoints against the design, and by the
Playwright suite in §3 — **every** screen (`tests/research.spec.ts` for the eleven
research screens, `tests/screens.spec.ts` for the eight older ones) is asserted to
return 200, render its `h1`, hydrate without page errors, survive a theme toggle, and
not scroll horizontally at 390px, plus per-screen interaction tests.

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
bun test packages/core   # 83 parity + scenario tests, ~98k assertions
bun test apps/api        # 15 endpoint tests
bun run check            # svelte-check: must stay at 0 errors, 0 warnings
bun run test:e2e         # Playwright, 27 tests; starts both dev servers itself
```

The e2e run needs a Chromium. It uses `SNOWLINE_BROWSER_PATH` if set, otherwise falls
back to a local Brave install, otherwise Playwright's own browser.

Regenerate the seed + parity reference from the bundle (only when the bundle changes):

```bash
bun run scripts/extract-reference.ts
```

That script loads `snowline-data.js` in a fake browser and dumps
`apps/api/src/db/seed-data.json` and `packages/core/test/reference.json`.
**Never hand-edit those two files.**

---

## 4. What is NOT built yet

Every route in `src/lib/nav.ts` now resolves; nothing 404s. Every function in
`snowline-data.js`'s public API is ported and covered by the parity test.

### Deliberately not built

Three add/edit modals. In the prototype each only mutates local component state
and never recalculates portfolio totals, so porting them would produce a form
with nowhere to write. Each screen says so on the page:

- Transactions: add / edit / import
- Corporate actions: record a new event
- Holdings drawer: the per-holding note

Building them for real means deciding where the write lands. A transaction is a
*stored fact*, so the ledger would stop being derived from `positions` and start
being derived from the trades — that is a data-model change, not a screen change,
and it needs the cost-basis decision in §6 first.

### Also still open

- **Hardcoded copy carried over from the prototype**: the quotes bar and the
  "why is it moving?" narrative. Both are marked with comments. There is no quote
  source in the data model (§6).
- **Coverage shape.** Core parity is thorough; the API has integration tests; every
  screen is covered end-to-end, but the presenters have no unit tests of their own.
  If a presenter grows more maths, test it directly rather than through Playwright.
- **No production build has been certified** — only `dev` servers, `svelte-check`
  and the test suites above.

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
  src/derive.ts                 the Engine (totals, categories, holdings, goal, cash)
  src/ledger.ts                 trades, lots, corporate actions, seeded price series
  src/history.ts                monthly history, benchmark path, solved cash flow
  src/research.ts               look-through, risk, market universe, backtest, technicals
  src/research-types.ts         the research catalog + preferences types
  src/rebalance.ts              the rebalancing allocator
  src/category-edits.ts         category mutations
  src/format.ts                 shared formatters
  test/parity.test.ts           pins the port to the prototype
  test/scenarios.test.ts        scenario regressions run against the bundle as oracle
  test/reference.json           generated — do not hand-edit

apps/api/
  src/index.ts                  Elysia routes
  src/db/schema.sql             SQLite schema
  src/db/index.ts               load/save
  src/db/seed.ts                seeder
  src/db/seed-data.json         generated — do not hand-edit
  test/integration.test.ts      endpoint tests

apps/web/
  src/app.css                   design tokens
  src/lib/api.ts                typed API client
  src/lib/charts.ts             SVG geometry helpers
  src/lib/nav.ts                route map + icons
  src/lib/screen-engine.ts      one engine per page snapshot; the presenters' only input
  src/lib/research-actions.ts   form actions for watchlist / lab scenario writes
  src/lib/components/           shared components (TopNav, Metric, DonutBreakdown, …)
  src/lib/components/dashboard/ the Dashboard's cards
  src/lib/presenters/*.js       view-model maths for the eleven research screens
  src/lib/screens/*.svelte      their markup
  src/routes/                   one route per screen
  tests/research.spec.ts        Playwright coverage of the research screens

scripts/extract-reference.ts    regenerates seed + parity reference from the bundle
playwright.config.ts            e2e config; boots both dev servers
```

## 8. Suggested next step

The port is complete, so the next work is a product decision, not a screen:

1. **Settle the cost-basis and dividend-recognition questions in §6.** They gate the
   transaction modals, and changing them later invalidates realised P&L, the lot
   display and the calendar's month buckets.
2. **Find a real quote source.** The quotes bar and "why is it moving?" are the last
   two places where a figure on screen is not derived from the data model.
3. **Certify a production build** and decide on deployment. Nothing has been built
   with `vite build` yet.

If instead the goal is more confidence in what exists: unit-test the presenters (§4).

### Fixed in the last pass

Adding browser coverage for the eight older screens found four real mobile-layout
faults, all now fixed and pinned by the 390px assertion:

- Categories: the `sr-only` header text was `position:absolute` inside the table's
  horizontal scroller, so its static position — 800px into a 900px table — dragged the
  whole document sideways. It is now clipped in flow.
- Dashboard: the dividend-growth legend was a single non-wrapping row; it now wraps.
- Dividend calendar: the twelve-month bar strip cannot shrink below its month labels,
  so it got the bundle's scroll-wrapper treatment.
- My goal: the scenarios table now scrolls like the year-by-year table above it, and
  `.card-head` wraps when its title and controls cannot share a line.

The goal screen's monthly-contribution input also gained an `aria-label` — the other
inputs on that screen are still labelled only by an adjacent `<span>`, which is worth
a sweep.
