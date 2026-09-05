# Snowline — build spec (v2, continuation)

A portfolio & dividend tracker with the information architecture of Snowball Analytics,
rebuilt with an original minimal visual identity. Do not copy their logo, brand name,
purple/cyan palette, or emoji iconography.

**This is a continuation spec.** Phases 1–3 are built and approved. Read the existing
files in the project before writing anything; this document describes the conventions
already established and the screens still to build.

---

## STATUS

Built and approved:
- Phase 1 — top navigation + Dashboard (9 blocks)
- Phase 2 — shared holdings table (Analytics ▸ Common, Portfolio ▸ Holdings)
- Phase 3 — Analytics ▸ Diversification (with X-Ray Funds), Analytics ▸ Dividends
- Phase 3 fixes — rating palette, symmetric growth axis, round yield ticks
- Data module — monthly history engine (value / invested / TWR / returns)
- Analytics ▸ Growth

Remaining:
- Phase 4 — Analytics ▸ Metrics, Analytics ▸ Report
- Phase 5 — Portfolio ▸ Transactions + New transaction modal, Dividend calendar, My goal
- Phase 6 — Portfolio ▸ Cash, Categories, Corporate actions
- Phase 7 — Tools ▸ Portfolio rebalancing, Top dividend stocks, Dividend payout calendar,
  Portfolio Lab, Find the Dip

Build one phase at a time and stop for review after each.

---

## THE DATA MODULE IS THE SOURCE OF TRUTH

All 12 positions live in a single data module, and every aggregate on every screen is
derived from it — category totals, allocation %, sector splits, gainers and losers,
dividend schedules, look-through decomposition, chart series, KPI cards, table totals.
No screen may hardcode a figure that contradicts it.

Any aggregate figure written in the original spec is **superseded** by what the module
computes. For reference, the current derived values are:

    Value                 $30,374.48   ($28,431.28 invested)
    Total profit          +$3,989.53   ▲14.03%   ·  daily -$36.24 ▼0.12%
    Capital gain          +$1,943.20   ▲6.83%
    Dividends received    $1,467.21    after tax, lifetime  ·  $1,293.02 trailing 12m
    IRR                   21.43%       (9.65% current holdings)
    TWR                   72.08%       vs SPY 84.82%
    Passive income        5.23%        $1,590.07 gross a year · $132.51 monthly
                                       $1,351.56 net of tax · 92 payments a year
    Shares                2,354.588805 across 12 holdings
    Portfolio P/E 23.7x · β 0.566 · Sharpe 0.949 · Sortino 2.103
    Goal $685,000, 4% progress, achievable by 2038

The 12 positions (fractional shares, two-tier values):

    AMZN     1.06554 sh   cost $254.86 ($239.18/sh)    value $283.89 ($266.43/sh)
    BIL      57.18 sh     cost $5,230.30 ($91.48)      value $5,240.22 ($91.65)
    DIMEFCD  2,000 sh     cost $2,000.00 ($1.00)       value $2,000.00 ($1.00)
    GLDI     25.59 sh     cost $4,288.78 ($167.60)     value $3,825.87 ($149.51)
    GOOGL    6.696399 sh  cost $2,186.47 ($326.51)     value $2,320.90 ($346.59)
    JEPQ     83.97 sh     cost $4,401.70 ($52.42)      value $5,050.59 ($60.15)
    NVDA     4.699698 sh  cost $961.80 ($204.65)       value $1,022.42 ($217.55)
    PEP      18.43 sh     cost $2,553.45 ($138.57)     value $2,599.58 ($141.07)
    QQQI     5.452381 sh  cost $274.80 ($50.40)        value $297.32 ($54.53)
    SCHD     136.52 sh    cost $3,727.94 ($27.31)      value $4,764.59 ($34.90)
    SLVO     8.820253 sh  cost $615.33 ($69.76)        value $616.71 ($69.92)
    V        6.164534 sh  cost $1,935.85 ($314.26)     value $2,352.39 ($381.60)
    plus a $2,000 cash line

Payment frequency: JEPQ, QQQI, GLDI, SLVO, BIL, DIMEFCD monthly; the rest quarterly.
Withholding tax 15%. Base currency USD. Portfolio name "US Core", as of 30 Aug 2026.

---

## ESTABLISHED CONVENTIONS — follow these on every new screen

### Color
- Light: canvas #FAFAF9, cards #FFFFFF, text #171717 / #737373 / #A3A3A3,
  hairlines #E7E5E4.
- Dark: canvas #0C0C0C, cards #171717, text #FAFAF9 / #A3A3A3 / #737373,
  hairlines #292524. Dark is a first-class mode, deliberately designed, not inverted.
- ONE accent: #0F7B57 light / #34D399 dark. Loss red #B91C1C / #F87171.
- Multi-series and multi-slice charts use a **monochrome ramp** from the accent to
  mid-grey, ordered by size. Never a rainbow, never an off-palette hue for a single
  category. Amber appears only as a thin left border, a small warning glyph, or a
  low-opacity tinted chip.

### Typography and numbers
- Inter or similar neutral sans. Scale 32/24/16/14/12. Weights 400/500/600.
- **Tabular figures everywhere.**
- Gains and losses: small caret glyph plus color. Never a colored pill background.

### The two-tier value pattern
Nearly every number is primary value on top, muted 12px secondary beneath, in the same
cell. This is the defining rule of the design system. Reuse the existing `<Metric>` and
`<TwoLineCell>` components rather than writing new markup.

    Value          $30,374.48   / $28,431.28 invested
    Cost basis     $5,230.30    / $91.48 per share
    Total profit   +$3,989.53 ▲14.03% / -$36.24 ▼0.12% daily
    Share in port. 17.25%       / 26.5% of Funds

### Charts
- Flat-topped bars, no rounded pill caps.
- Dashed hairline gridlines only.
- **Y-axis ticks must be round numbers** ($0/$50/$100/$150, 0/25/50/75%).
- **Diverging axes must be symmetric** (-20% to +20%, not +20% to -10%).
- Rich hover cards via the existing `<ChartTooltip>`: a title, a headline value, and a
  list of labeled rows.

### Layout and tables
- Desktop-first at 1440px; verify at 1280px. No horizontal page overflow.
- Wide tables sit in a horizontal scroll region with the first column frozen, sensible
  per-column min-widths, and no wrapping inside numeric cells.
- Sortable headers; dotted underline on any header or value carrying a tooltip.
- Every control must actually work against the data module.

### Chrome
- Top bar, not a sidebar: monogram, Dashboard · Analytics · Portfolio · Tools ·
  Community, then Insights icon, "+ Add" pill, search, star, portfolio selector,
  currency selector, avatar (theme toggle and settings live in the avatar menu).
- Analytics has its own sub-tab bar: Common · Diversification · Dividends · Growth ·
  Metrics · Report, with a date-range picker and a "Choose a category or an asset…"
  filter on the right.
- Page head pattern: H1 title, portfolio name beside it, a metadata line beneath
  (e.g. "12 positions · $30,374.48 | Largest single exposure BIL 17.3%"), "…" overflow
  at the right.
- No emoji as UI elements. No marketing copy in the app shell. Upsells are restrained:
  blurred rows behind a quiet bar, never a bright gradient button.

---

## PHASE 4 — remaining screens

### Analytics ▸ Metrics
A 2-column grid of metric cards. Each card: title with a "?" tooltip, a one-line
plain-English explanation, then either a large value or a **number-line gauge**.

Build the gauge as a **reusable component**, not five hand-drawn variants. It is a
horizontal axis with labeled endpoints, a marker for the portfolio, an optional marker
for the benchmark, and a verdict tag. Verdict tags are subtle tinted text chips, never
saturated fills; use small geometric glyphs at the endpoints, not emoji.

Cards:
- **Portfolio TWR** — 72.08%, large value, with a benchmark chip "SPY 84.82% ▲12.75%".
  Explanation: true performance over the portfolio's lifetime, excluding the impact of
  cash flows.
- **Portfolio P/E** — 23.7x on a 0x–70x gauge with a Portfolio marker. Explanation:
  weighted average P/E of all individual stocks combined.
- **Volatility / beta** — verdict line "Volatility of your portfolio (β = 0.566)" with a
  tag "lower than the market"; gauge with Market and Portfolio markers. Explanation:
  portfolio volatility relative to the market.
- **Risk-adjusted return / Sharpe ratio** — "(Sharpe = 0.949)" with a "requires
  attention" tag; gauge with SPY and Portfolio markers. Explanation: how well
  profitability compensates for risk.
- **Risk-adjusted return / Sortino ratio** — "(Sortino = 2.103)" with an "o.k." tag and
  the note that a value above two is considered good; gauge with SPY and Portfolio
  markers. Explanation: same, but only negative returns are considered.

### Analytics ▸ Report
- A "Benchmarks: Select" strip, and a hint line "Click a row in the table to make it
  appear on the graph" with a "Clear all" link.
- Monthly portfolio-value bar chart with a hover tooltip, driven by the monthly history
  engine already in the data module.
- "Export to PDF" and "Export to Excel" buttons on the left; "Time Grouping (Monthly)"
  and "Time Period (Last 1 year)" dropdowns on the right.
- A wide metrics-by-month table — rows: Portfolio value, At the beginning of the period,
  At the end of the period, Change, Total profit, Capital gain, Dividends, Taxes, Fees,
  Deposits, Withdrawals; columns: months. Clicking a row plots it on the chart and marks
  it with an accent left rule. Horizontal scroll with the first column frozen.
- Lower rows blurred behind a restrained "Upgrade your plan to unlock the full report"
  bar.

---

## PHASE 5 — Portfolio screens

### New transaction modal
Title "New transaction", three tabs: **Trades | Incomes | Expenses**. Required fields
marked with an accent asterisk; every label has a "?" tooltip. Buttons: Cancel · Save ·
Save and add more.

- **Trades** — "Ticker/Company *" combobox with an "or add a custom asset" link. The
  autocomplete lists the same ticker across exchanges: logo, "AMZN (US) · 1.066 shares in
  portfolio" with the company name beneath, listing currency right-aligned ($, ARS, CA$,
  Mex$); rows for exchanges already held show the position size. Then Operation
  (Buy/Sell) and Date side by side, Shares and Price side by side, Fee, Note, and an
  "Update cash balance" checkbox.
- **Incomes** — Ticker/Company, Operation (Dividends), Date, "Total received" and "per
  share" side by side, Fee, Tax, Note, Update cash balance.
- **Expenses** — Operation (Fee), Ticker/Company (optional), Date, Fee with an inline
  currency selector, Note, Update cash balance with a "Current cash balance: $0.00"
  helper line.

### Portfolio ▸ Transactions
- Top-right: **Import · Import history · Export**.
- Tabs: **Trades | Incomes | All**.
- Controls: "+ Add" opening the modal, search, "Filters", column settings.
- Summary strip with colored keys: Buy $53,715.41 · Sell $27,354.64 · Fee.
- Columns: checkbox, Operation, Holding (name + ticker beneath), Date, Shares, Price,
  Fee/Tax, Summ (signed, negative for buys), Total profit (% over $), Note; trailing
  note, edit, and delete icon buttons per row.

### Portfolio ▸ Dividend calendar
- Page head: title with "?", a period stepper `‹ One year ahead ›`, search icon,
  "Status" dropdown, "Payout type" dropdown, "…" menu.
- Left card: **Annual income $1,590.07**, inner list — Monthly $132.51 · Daily · Yield
  5.23%.
- Right card: 12-month forward bar chart with a **three-state legend: Paid · Declared ·
  Estimated**, as three tints of the accent (paid darkest), value labels above bars.
- Month stepper `‹ August 26 ›` with a total chip, and a **Calendar | List** toggle.
- Calendar grid Mon–Sun. Each day cell: day number, right-aligned day total in the accent
  when non-zero, and one event card per payout — logo tile, ticker + truncated fund name,
  amount, status dot, yield %. Today's cell has a filled accent day number.
- List view: Ticker, Ex-date, Pay date, Shares, Per share, Gross, Net after tax, Status.

### Portfolio ▸ My goal
- Page head with a "What's new?" pill.
- **Left config panel, sticky**: segmented "Goal" toggle **Value | Passive income**; an
  amount input with currency selector and a helper line beneath; an "Achieve by"
  dropdown ("2050 (in 24 years)"); a "Contributions" field ($300 per month) with the
  computed total right-aligned and "$3,600.00 per year" beneath; two collapsible sections
  "Returns and inflation" and "Other" with "+ Expand"; a full-width "Save and calculate"
  button.
- **Right results area**: progress ring (4%) + "$30.37k / $685.00k Value"; a verdict
  block "Achievable in 12 years — By 2038"; a projection chart 2026→2050 with two lines
  (Portfolio, Safe scenario), a dashed goal line, and a marker where each line crosses
  it; a reward line; assumption chips — Returns · Contributions $300.00 (▲3.5% annually)
  · Reinvest dividends — plus "More…" and an "All parameters and scenarios + Expand" row.
- **Results table** with the note "All forecasts are approximate. Future values are
  calculated from today's date." Columns: Year, Goal, Contributions ($/year over
  $/month), Portfolio (Value), Safe scenario (Value). First row labeled "today", then one
  row per year to the target.

---

## PHASE 6 — remaining Portfolio screens

- **Cash** — balances by currency, deposit/withdrawal history, cash drag %.
- **Categories** — user-defined buckets (Core, Dividend, Growth, Speculative) with an
  assignment UI and allocation by category.
- **Corporate actions** — splits, mergers, ticker changes, special dividends log.

---

## PHASE 7 — Tools

- **Portfolio rebalancing** — target vs current bars with a target marker per holding,
  drift %, buy/sell $ to reach target, plus a "new cash to invest" input that produces
  buy-only suggestions.
- **Top dividend stocks** — screener table: yield, payout ratio, growth streak, filters.
- **Dividend payout calendar** — market-wide upcoming ex-dates, not portfolio-limited.
- **Portfolio Lab** — backtest builder: pick tickers and weights, date range, produce an
  equity curve vs benchmark with CAGR, max drawdown, total dividends.
- **Find the Dip** — holdings and watchlist names trading below their moving average or
  off their 52-week high, with % from high.

Also still to do: empty state for a new portfolio, loading skeletons, and a settings page
(base currency, tax rate, benchmark, theme).

---

## Build notes
React + Tailwind, lucide-react, recharts. Responsive: top nav → hamburger + bottom tab
bar under 768px; wide tables → stacked cards preserving the two-tier pattern. Both light
and dark mode on every new screen. All interactions functional against the data module.
