Build a multi-screen web app prototype: a portfolio & dividend tracker with the
information architecture of Snowball Analytics, rebuilt with an original minimal visual
identity. Do not copy their logo, brand name, purple/cyan palette, or emoji-based
iconography — only the structure and feature set below. Call the product "Snowline".

## Audience
A long-horizon retail investor holding US ETFs and stocks. Base currency USD, 15%
dividend withholding tax.

## Design direction — minimal, data-first

- Light mode: canvas #FAFAF9, cards #FFFFFF, text #171717 / #737373 / #A3A3A3,
  hairlines #E7E5E4.
  Dark mode: canvas #0C0C0C, cards #171717, text #FAFAF9 / #A3A3A3 / #737373,
  hairlines #292524. Dark is a first-class mode, not an inversion afterthought.
- ONE accent: restrained green #0F7B57 (light) / #34D399 (dark) for gains and brand
  moments. Red #B91C1C / #F87171 for losses. Amber for warnings, as a thin left border
  or small tag only.
- Multi-series charts use TINTS OF THE ACCENT plus mid-grey — never a rainbow. For donut
  charts with many slices, use a monochrome ramp from the accent to grey, ordered by size.
- Separation by 1px hairlines, not shadows. No gradients, no glassmorphism, no colored
  icon chips beside labels. Corner radius max 8px.
- Typography: Inter or similar. TABULAR FIGURES everywhere. Scale 32/24/16/14/12.
  Weights 400/500/600 only.
- Gains/losses: small caret glyph + color, never a colored pill background.
- Charts: flat-topped bars (no rounded pill caps), dashed hairline gridlines, direct
  labels over legends where possible.

### The core data pattern — use everywhere
Nearly every number is TWO-TIERED: primary value on top, muted 12px secondary beneath in
the same cell.

    Value          $30,374.50   / $28,432.67 invested
    Cost basis     $5,230.30    / $91.48 per share
    Total profit   +$5,582.45 ▲19.6% / -$36.24 ▼0.12% daily
    Dividend yield 3.04%        / 3.04% yield on cost
    Share in port. 17.25%       / 38.94% target
    IRR            21.43%       / 9.65% current holdings

Build reusable `<Metric primary secondary />` and `<TwoLineCell>` components.

### Rich tooltips
Charts use detailed hover cards, not bare values. A Future-payments bar shows the month
total plus a per-holding breakdown; a Holdings-performance bar shows total profit %,
capital gain, dividends received, taxes, fees paid. Build one `<ChartTooltip>` taking a
title, a headline value, and a list of labeled rows. Table headers with a caveat show a
tooltip on hover (e.g. "Total dividends received after tax").

## Navigation — top bar, NOT a sidebar

56px bar, 1px bottom hairline. LEFT: flat monogram mark (solid accent square, 6px radius,
single letter, no gradient), then: Dashboard · Analytics · Portfolio · Tools · Community.
Active = soft tinted pill + accent text.
RIGHT: "Insights" icon button (outlined square), "+ Add" primary pill, search icon, star
icon, portfolio selector (briefcase + name + chevron), currency selector (USD + chevron),
avatar (opens menu with theme toggle and settings).

Dropdown panels on Analytics / Portfolio / Tools: card background, 8px radius, 1px
border, soft shadow, 20px muted icon per row, 44px rows, groups split by a hairline.

    Analytics ▸ Common · Diversification · Dividends · Growth ── Metrics · Report
    Portfolio ▸ Holdings · Transactions · Dividend calendar · My goal ── Cash · Categories
                · Corporate actions
    Tools ▸ Portfolio rebalancing · Top dividend stocks · Dividend payout calendar
            · Portfolio Lab · Find the Dip
    Community ▸ public portfolios grid

## DASHBOARD — 9 blocks in this order

1. **Page head** — portfolio name as H1 with inline comment icon; "…" overflow at right.
2. **KPI row, 4 cards** — Value ($30,374.50, eye icon to hide amounts, "$28,432.67
   invested", plus a small "Worth in 10 years?" secondary pill); Total profit
   (+$5,582.45 ▲19.6% / -$36.24 ▼0.12% daily); IRR (21.43% / 9.65% current holdings,
   dotted underline = tooltip); Passive income (5.23% ▲4.5% / $1,589.68 annually).
   Every label carries a "?" tooltip affordance.
3. **Portfolio insights** — row of 3 dismissible advisory cards: severity tag, headline,
   one supporting line, "See details" text link. Content: asset allocation is
   concentrated · sector allocation is uneven · "Dead weight" holdings underperforming
   the market. Style as quiet cards with a 2px amber left border on card background —
   not full amber outlines with solid blue buttons.
4. **Allocation** — left: donut of current allocation with a dashed outer ring marking
   target. Right: sortable category table — Name (name + "6 items" beneath),
   Value/Invested (two-tier), Gain ($ / %), Allocation (current % / target % beneath),
   each row with a thin colored left rule matching its donut segment. Rows: Funds, Cash,
   Financials, Consumer Discretionary, Information Technology.
5. **My Quotes** — single row of watched FX/tickers with price and change %, plus a
   "Go to quotes" link right-aligned.
6. **Why is it moving?** — cards for holdings with unusual daily moves: ticker, change %,
   short generated explanation. Include one locked/blurred card with a restrained
   "Upgrade for full explanations" panel beside it — no bright gradient button.
7. **Top day gainers / Top day losers** — two lists: logo, company name, ticker beneath,
   market value right-aligned, change % and $ beneath.
8. **Future payments / Dividends received** — Future payments: "Next 12m $1,589.68" and
   "Monthly $132.47" mini-metrics with colored keys, forward 12-month bar chart
   (Aug→Jul) where received portions render solid accent and projected portions in a
   lighter tint of the same hue; rich per-holding tooltip; "Calendar →" link and "…"
   menu. Dividends received: period dropdown ("12 trailing months"), granularity
   dropdown ("Monthly"), Total metric, bar chart, chart-type toggle icon.
9. **Dividend growth / My goal** — Dividend growth: grouped bars by calendar month
   comparing 2024/2025/2026 in three tints of one hue, legend beneath. My goal: progress
   ring (4%), "$30.37k / $685.00k Value", verdict block "Achievable in 12 years — By
   2038", projection chart to 2050 with two lines (Portfolio vs conservative "Safe
   scenario") and a marker where each crosses the goal, plus "More →". No emoji — use
   simple geometric markers.

## ANALYTICS — shared shell

Sub-tab bar under the top nav: Common · Diversification · Dividends · Growth · Metrics ·
Report, small muted icon each, active tab underlined in the accent. Right side: date-range
picker icon and a filter combobox "Choose a category or an asset…". A "Benchmarks: Select"
strip appears on Growth and Report.

### Common
The 4 KPI cards repeat, then the main holdings table (see the shared Holdings Table spec
below).

### Diversification
- A top-right **"X-Ray Funds" toggle with a NEW badge** — when on, ETFs are decomposed
  into their underlying holdings so single-stock exposure is revealed (AAPL and MSFT
  appear even though they aren't held directly).
- **All holdings** card: donut with percentage labels on the outside, beside a scrollable
  ranked list where each row is ticker + company name, right-aligned % and ($ value),
  and a thin proportional bar under the row. A "Buy in" checkbox filters to positions
  you're adding to.
- Below, a row of **filter pills: Sectors | Classes | Currencies | Regions | Countries** —
  each swaps the card beneath.
- **Economy sectors** card: same donut + ranked-list-with-bars pattern, with "Buy in" and
  "Show holdings" checkboxes. Rows: Funds 29.8%, Information Technology 15.8%, Consumer
  Staples 12.8%, Communication Services 10.9%, Financials 9.3%, Cash 6.6%, Healthcare
  4.2%, Consumer Discretionary 4.1%, Energy 3.2%, Industrials 1.8%, Materials 1.3%,
  Utilities 0.2%, Real Estate 0.034%.

### Dividends
- Left column, two stacked metric cards: **Yield** (5.23%, "6.1% before tax", "5.59%
  yield on cost") and **Dividends** ($1,589.68 annually ▲4.5%, "$132.47 monthly").
- **Yield/Payout** bar chart per holding, sorted descending, with a thin horizontal marker
  on each bar showing payout ratio against the yield bar. Two dropdowns: metric
  ("Yield (%)") and grouping ("Holdings").
- **Passive income diversification** — donut + ranked list with bars, by income
  contribution (GLDI 30.4% $482.74, JEPQ 29.3% $465.57, BIL 10% $159.19, SCHD 7.7%,
  SLVO 7.5%, PEP 5.8%, DIMEFCD 5.7% …).
- **Dividend rating** — donut summarising rating distribution (Reliable / Safe / OK /
  Not available) beside a table: Asset, Value/Invested, Annual dividends, and a Dividend
  rating cell showing a 0-100 score chip plus a word label, with a small warning glyph
  where relevant. Render score chips as a number in a subtle tinted box, not a saturated
  badge.
- **Average annual growth** — per-holding bar chart with a "Holdings" grouping dropdown.
- **Future payments** and two **Dividends received** cards (one by month, one by holding).
- **Dividend growth** — grouped bars by month across years.

### Growth
- "Benchmarks: Select" strip with a "See tutorial" link.
- **Portfolio value** — range tabs (7d 1m 3m 6m YTD 1y 5y all + custom-date icon), the
  date span and total change right-aligned, an area chart with two series (Portfolio,
  Invested) and a crosshair tooltip listing both values at the hovered date.
- **Portfolio performance** — same range tabs, single filled area line of cumulative
  profit, span and change right-aligned.
- **Dynamics of portfolio returns** — period pills (all 12m 2026 2025 2024 2023), a bar
  chart of monthly returns with positive bars in the accent and negative in red, each bar
  labeled with its %, and a "View details →" link.
- **Holdings performance** — horizontal bars per ticker sorted descending, % label at each
  bar end, negative bars in red, range tabs above, a chart/table view toggle, rich
  tooltip (total profit %, capital gain, dividends received, taxes, fees paid), and
  "View details →".

### Metrics
A 2-column grid of metric cards. Each: title with "?" tooltip, a one-line plain-English
explanation, then either a large value or a **number-line gauge** — a horizontal axis with
labeled endpoints, a marker for your portfolio and a marker for the benchmark, plus a
verdict tag. Cards:
- Portfolio TWR — 72.08%, with a benchmark chip "SPY: 84.82% ▲12.75%".
- Portfolio P/E — 23.7x on a 0x–70x gauge with a Portfolio marker.
- Volatility/beta — "Volatility of your portfolio (β = 0.566)" with a tag "lower than the
  market", gauge with Market and Portfolio markers.
- Risk-adjusted return / Sharpe ratio — "(Sharpe = 0.949)" with a "requires attention"
  tag, gauge with SPY and Portfolio markers.
- Risk-adjusted return / Sortino ratio — "(Sortino = 2.103)" with an "o.k." tag and the
  note that above two is considered good, gauge with SPY and Portfolio markers.
Replace emoji endpoint markers with small geometric glyphs; verdict tags are subtle
tinted text chips, not saturated fills.

### Report
- Benchmarks strip, and a hint line "Click a row in the table to make it appear on the
  graph" with a "Clear all" link.
- Monthly portfolio-value bar chart with a hover tooltip.
- "Export to PDF" and "Export to Excel" buttons on the left; "Time Grouping (Monthly)"
  and "Time Period (Last 1 year)" dropdowns on the right.
- A wide metrics-by-month table: rows Portfolio value, At the beginning of the period,
  At the end of the period, Change, Total profit, Capital gain, Dividends, Taxes, Fees,
  Deposits, Withdrawals — columns = months. Selected row highlighted with an accent left
  rule. Lower rows blurred behind a restrained "Upgrade your plan to unlock the full
  report" bar.

## SHARED HOLDINGS TABLE
Used by both Analytics ▸ Common and Portfolio ▸ Holdings.

- Top-right of the page: an **"Add investments"** primary button opening a menu with two
  groups — Holdings: New trade / holding · New dividend income · Import a spreadsheet ·
  Manage cash. Other: New custom holding · New corporate action.
- Controls row: a segmented currency toggle **"In holding currency | In USD"**, a
  "Show sold" checkbox, a search field, a sort button, an export/share button, and a
  column-settings button.
- View tabs: **My holdings | General | Dividends | Returns** — each swaps the column set.
  - My holdings: Holding, Shares, Cost basis, Current value, Dividends, Dividend yield,
    Dividend growth (5Y), Total profit, IRR, Share in portfolio.
  - General: Holding, Shares, Price, Cost basis, Current value, Total profit, Share in
    portfolio, Sector, Class, Currency.
  - Dividends: Holding, Shares, Annual dividend, Per share, Yield, Yield on cost, Payout
    ratio, Dividend growth 5Y, Payment frequency, Next ex-date.
  - Returns: Holding, Cost basis, Current value, Div. received, Capital gain, Realized
    P&L, Total profit, Daily, IRR.
- A leading checkbox column for bulk selection, and a trailing per-row "…" menu.
- Holding cell: logo tile + company name + ticker beneath. Shares up to 6 decimals.
  Numeric cells two-tiered (total / per share). Sortable headers, dotted underline on
  headers carrying tooltips. Small warning glyph on rows with a data caveat.
- Sticky **Total** row at the bottom: 2,354.58 shares, $28,431.27, $30,374.50, $1,467.21
  dividends received, +$1,941.83 ▲6.83% capital gain, $579.12 realized, +$3,960.70
  ▲13.93% total profit, -$36.24 ▼0.12% daily, ▲17.38% IRR.
- Footer: a page-size dropdown (25) and a range label "See 1–12 from 12".
- Row click opens a detail side panel: price chart, position summary, transactions,
  dividend history, notes.

## NEW TRANSACTION MODAL
A right-side or centered modal titled "New transaction" with three tabs:
**Trades | Incomes | Expenses**. Required fields marked with an accent asterisk; every
label has a "?" tooltip.

- **Trades** — "Ticker/Company *" combobox with an "or add a custom asset" link on the
  right. The autocomplete lists the same ticker across exchanges: each row shows a logo,
  "AMZN (US) · 1.066 shares in portfolio" with the company name beneath, and the listing
  currency right-aligned ($, ARS, CA$, Mex$); the row for an exchange you already hold
  shows the position size. Then Operation (Buy/Sell) and Date side by side, Shares and
  Price side by side, Fee, Note (textarea), an "Update cash balance" checkbox, and
  buttons Cancel · Save · Save and add more.
- **Incomes** — Ticker/Company, Operation (Dividends), Date, "Total received" and "per
  share" side by side, Fee, Tax, Note, Update cash balance, same buttons.
- **Expenses** — Operation (Fee), Ticker/Company (optional), Date, Fee with an inline
  currency selector, Note, Update cash balance with a "Current cash balance: $0.00"
  helper line, same buttons.

## PORTFOLIO screens

### Holdings
The shared holdings table, standalone.

### Transactions
- Top-right: **Import · Import history · Export** buttons.
- Tabs: **Trades | Incomes | All**.
- Controls: a "+ Add" button opening the New transaction modal, a search field, a
  "Filters" button, and a column-settings button.
- A summary strip of totals with colored keys: Buy $53,715.41 · Sell $27,354.64 ·
  Fee $37.xx.
- Table columns: checkbox, Operation (Buy/Sell/Dividend/Fee), Holding (name + ticker
  beneath), Date, Shares, Price, Fee/Tax, Summ (signed, negative for buys), Total profit
  (% over $ beneath), Note; trailing note, edit, and delete icon buttons per row.

### Dividend calendar
- Page head: title with "?" tooltip, a period stepper `‹ One year ahead ›`, a search
  icon, a "Status" dropdown, a "Payout type" dropdown, and a "…" menu.
- Left card: **Annual income $1,589.68**, with a small inner list — Monthly $132.47 ·
  Daily $4.36 · Yield 5.23%.
- Right card: 12-month forward bar chart with a **three-state legend: Paid · Declared ·
  Estimated**, each state a different tint of the accent (paid darkest, estimated
  lightest), value labels above each bar.
- Below: a month stepper `‹ August 26 ›` with a total chip (+$116.71) and a
  **Calendar | List** view toggle.
- Calendar grid Mon–Sun. Each day cell shows the day number, a right-aligned day total in
  the accent when non-zero, and one event card per payout: logo tile, ticker + truncated
  fund name, amount, a status dot, and the yield %. Today's cell is highlighted with a
  filled accent day number.
- List view: Ticker, Ex-date, Pay date, Shares, Per share, Gross, Net after tax, Status.

### My goal
- Page head: title with a "What's new?" pill.
- **Left config panel (narrow, sticky)**: a segmented "Goal" toggle **Value | Passive
  income**; an amount input with a currency selector and a helper line beneath
  ("Portfolio value $300,000.00"); an "Achieve by" dropdown ("2050 (in 24 years)"); a
  "Contributions" field ($300 per month) with the computed total right-aligned
  ($1,097.93) and "$3,600.00 per year" beneath; two collapsible sections "Returns and
  inflation" and "Other" each with a "+ Expand" link; a full-width "Save and calculate"
  button.
- **Right results area**: progress ring (4%) + "$30.37k / $685.00k Value", and a verdict
  block "Achievable in 12 years — By 2038". Projection chart 2026→2050 with two lines
  (Portfolio, Safe scenario), a dashed goal line, and a marker where each line crosses
  it. Beneath: a reward line ("Your goal can be achieved in 12 years (by 2038)") and a
  row of assumption chips — Returns ▲21.43% · Contributions $300.00 (▲3.5% annually) ·
  Reinvest dividends ✓ — plus a "More…" link and an "All parameters and scenarios
  + Expand" row.
- **Results table** with the note "All forecasts are approximate. Future values are
  calculated from today's date." Columns: Year, Goal, Contributions ($/year over $/month),
  Portfolio (Value), Safe scenario (Value). First row labeled "today", then one row per
  year to the target.

### Cash
Balances by currency, deposit/withdrawal history, cash drag %.

### Categories
User-defined buckets with an assignment UI and allocation by category.

### Corporate actions
Splits, mergers, ticker changes, special dividends log.

## TOOLS screens
Portfolio rebalancing (target vs current bars with target markers, drift %, buy/sell $
per holding, plus a "new cash to invest" input producing buy-only suggestions) · Top
dividend stocks (screener: yield, payout ratio, growth streak, filters) · Dividend payout
calendar (market-wide ex-dates) · Portfolio Lab (backtest builder: tickers + weights +
date range → equity curve vs benchmark, CAGR, max drawdown, total dividends) · Find the
Dip (holdings and watchlist names below their moving average or off 52-week highs).

Also: empty state for a new portfolio, loading skeletons, settings page (base currency,
tax rate, benchmark, theme).

## Mock data

Portfolio "US Core": value $30,374.50, invested $28,432.67, total profit +$5,582.45
(+19.6%), daily -$36.24 (-0.12%), IRR 21.43% (9.65% current holdings), passive income
5.23% / $1,589.68 annually / $132.47 monthly / $4.36 daily, trailing-12m dividends
received $1,293.02, lifetime dividends received $1,467.21, realized P&L $579.12, goal
$685,000 by 2038 (4% progress), TWR 72.08% vs SPY 84.82%, P/E 23.7x, β 0.566,
Sharpe 0.949, Sortino 2.103. Transaction totals: Buy $53,715.41, Sell $27,354.64.

Holdings with realistic fractional shares and two-tier values:

    AMZN     1.06554 sh   cost $254.86 ($239.18/sh)    value $283.89 ($266.43/sh)    yield 0%
    BIL      57.18 sh     cost $5,230.30 ($91.48)      value $5,240.22 ($91.65)      yield 3.04%
    DIMEFCD  2,000 sh     cost $2,000.00 ($1.00)       value $2,000.00 ($1.00)       yield 4.5%
    GLDI     25.59 sh     cost $4,288.78 ($167.60)     value $3,825.87 ($149.51)     yield 12.62%
    GOOGL    6.696399 sh  cost $2,186.47 ($326.51)     value $2,320.90 ($346.59)     yield 0.22%
    JEPQ     83.97 sh     cost $4,401.70 ($52.42)      value $5,050.59 ($60.15)      yield 9.22%
    NVDA     4.699698 sh  cost $961.80 ($204.65)       value $1,022.42 ($217.55)     yield 0.39%
    PEP      18.43 sh     cost $2,553.45 ($138.57)     value $2,599.58 ($141.07)     yield 3.57%
    QQQI     5.452381 sh  cost $274.80 ($50.40)        value $297.32 ($54.53)        yield 12.19%
    SCHD     136.52 sh    cost $3,727.94 ($27.31)      value $4,764.59 ($34.90)      yield 2.55%
    SLVO     8.820253 sh  cost $615.33 ($69.76)        value $616.71 ($69.92)        yield 19.22%
    V        6.164534 sh  cost $1,935.85 ($314.26)     value $2,352.39 ($381.60)     yield 0.6%

Payment frequency: JEPQ, QQQI, GLDI, SLVO, BIL monthly; the rest quarterly. Generate
consistent ex-dates and pay-dates, and give each upcoming payout a status of Paid,
Declared, or Estimated.

## Build notes
React + Tailwind, lucide-react, recharts. Responsive: top nav → hamburger + bottom tab bar
under 768px; wide tables → stacked cards preserving the two-tier pattern; the report table
scrolls horizontally with a frozen first column. All interactions functional against
in-memory mock data: dropdowns, sub-tabs, view tabs, filter pills, X-Ray toggle, currency
toggle, sorting, search, column settings, pagination, row selection, side panel, the
three-tab transaction modal with ticker autocomplete, hide-amounts toggle, theme toggle,
dismissing insight cards, calendar month stepping, goal recalculation, chart range tabs
and tooltips.

## Avoid
Purple/cyan gradients, rainbow donut palettes, rounded pill bar caps, colored icon chips
beside every label, emoji as UI elements, solid blue CTA buttons inside advisory cards,
marketing copy in the app shell.

## Build order — pause after each phase
1. Top nav + full Dashboard
2. Shared holdings table (Analytics ▸ Common) — the hardest piece
3. Analytics ▸ Diversification and Dividends
4. Analytics ▸ Growth, Metrics, Report
5. Portfolio ▸ Transactions + New transaction modal, Dividend calendar, My goal
6. Portfolio ▸ Cash, Categories, Corporate actions
7. Tools screens
