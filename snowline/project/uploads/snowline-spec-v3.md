# Snowline — build spec (v3)

A portfolio & dividend tracker with the information architecture of Snowball Analytics,
rebuilt with an original minimal visual identity. Do not copy their logo, brand name,
purple/cyan palette, or emoji iconography.

**This is a continuation spec.** Most of the app is built. Read the existing files in the
project before writing anything — especially `snowline-data.js` and the screens already
shipped. This document records the conventions in force and the screens still to build.

---

## STATUS

Built and approved:
- Top navigation + Dashboard (9 blocks)
- Shared holdings table — Analytics ▸ Common and Portfolio ▸ Holdings
- Analytics ▸ Diversification, with the X-Ray Funds look-through toggle
- Analytics ▸ Dividends
- Analytics ▸ Growth
- Analytics ▸ Metrics, including the reusable `NumberLineGauge` component
- Analytics ▸ Report
- Portfolio ▸ Transactions, with the three-tab New transaction modal
- Portfolio ▸ Dividend calendar
- `snowline-data.js` — positions, transaction ledger, monthly history engine,
  `riskStats()`, `riskVerdict()`, dividend schedules, look-through decomposition

Remaining:
- **Phase 5 (last screen)** — Portfolio ▸ My goal
- **Phase 6** — Portfolio ▸ Cash, Categories, Corporate actions
- **Phase 7** — Tools ▸ Portfolio rebalancing, Top dividend stocks, Dividend payout
  calendar, Portfolio Lab, Find the Dip
- Cross-cutting — empty state for a new portfolio, loading skeletons, settings page
  (base currency, tax rate, benchmark, theme)

Build one screen at a time and stop for review after each. Sessions have run out of
context when several screens were attempted in one go.

---

## THE DATA MODULE IS THE SOURCE OF TRUTH

Every aggregate on every screen derives from `snowline-data.js`. No screen may hardcode a
figure that contradicts it. When a new screen needs a computation that doesn't exist yet,
add it to the module rather than computing locally.

Current derived values:

    Value                 $30,374.48   ($28,431.28 invested, open positions)
    Total profit          +$3,989.53   ▲14.03%   ·  daily -$36.24 ▼0.12%
    Capital gain          +$1,943.20   ▲6.83%
    Dividends received    $1,467.21    after tax, lifetime  ·  $1,293.02 trailing 12m
    IRR                   21.43%       (9.65% current holdings)
    TWR                   72.08%       vs SPY 84.82%, a 12.74pp gap
    Passive income        5.23%        $1,590.07 gross a year · $132.51 monthly
                                       $1,351.56 net of tax · 92 payments a year
    Shares                2,354.588805 across 12 holdings
    Risk                  β 0.566 · Sharpe 0.949 · Sortino 2.103 · P/E 23.7x
                          risk-free 3.04% (the portfolio's own BIL yield)
                          window: Oct 2024 – Aug 2026, 23 monthly returns, lifetime only
    Ledger                201 transactions across 14 instruments
                          $31,104.94 in buys · $3,126.90 in sells · $30.81 in fees
                          TSM and XOM are closed positions
    Goal                  $685,000 target, 4% progress, achievable by 2038

The 12 open positions:

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
Withholding tax 15%. Base currency USD. Portfolio "US Core", as of 30 Aug 2026.

Generated ledger prices must stay plausible per instrument — tight bands for cash-like
holdings (DIMEFCD fixed at $1.00, BIL around $91.50), wider for equities — while still
reconciling to each position's cost basis.

---

## ESTABLISHED CONVENTIONS

### Color
- Light: canvas #FAFAF9, cards #FFFFFF, text #171717 / #737373 / #A3A3A3,
  hairlines #E7E5E4.
- Dark: canvas #0C0C0C, cards #171717, text #FAFAF9 / #A3A3A3 / #737373,
  hairlines #292524. Plus `--track` and `--tick` for chart rails and ticks, which are
  invisible if they inherit `--line` on a dark card. Read them as
  `var(--tick, var(--line))` so components degrade safely.
- One accent: #0F7B57 light / #34D399 dark. Loss red #B91C1C / #F87171.
- Multi-series and multi-slice charts use a **monochrome ramp** from the accent to
  mid-grey, ordered by size. Never a rainbow, never an off-palette hue for one category.
  Amber only as a thin left border, a small warning glyph, or a low-opacity chip.

### Typography and numbers
- Inter or similar neutral sans. Scale 32/24/16/14/12. Weights 400/500/600.
- **Tabular figures everywhere.**
- Gains and losses: small caret glyph plus color, never a colored pill background.
- Format numbers for display — never surface raw floats in inputs or cells (2 decimals
  for prices, up to 6 for fractional shares).

### The two-tier value pattern
Nearly every number is a primary value with a muted 12px secondary beneath it in the same
cell. This is the defining rule of the design system. Reuse `<Metric>` and `<TwoLineCell>`
rather than writing new markup.

### Charts
- Flat-topped bars, dashed hairline gridlines.
- **Round y-axis ticks.** **Symmetric diverging axes.**
- Rich hover cards via `<ChartTooltip>`: title, headline value, labeled rows.
- Log scales are acceptable where the range demands it, but label them.

### Layout and tables
- Desktop-first at 1440px; verify at 1280px. No horizontal page overflow.
- Wide tables sit in a horizontal scroll region with the first column frozen, per-column
  min-widths, and no wrapping inside numeric cells.
- Sortable headers; dotted underline on anything carrying a tooltip.
- Every control works against the data module — no decorative inputs.
- Modals prefill from the row being edited, and their footer text reflects what the action
  will actually do.

### Chrome
- Top bar, not a sidebar. Analytics has its own sub-tab bar with a date-range picker and
  an asset/category filter on the right.
- Page head: H1, portfolio name beside it, a metadata line beneath, "…" overflow right.
- Theme toggle lives in the avatar menu, persisted to localStorage via `data-theme`.
- Controls that exist only as props in a host tweaks overlay are invisible in practice —
  surface anything the user should reach as an on-screen control.
- No emoji as UI elements. No marketing copy in the app shell. Upsells stay restrained:
  blurred rows behind a quiet bar, never a bright gradient button.
- **Wire nav links as you go** — several screens shipped with `#` placeholders and had to
  be fixed later.

---

## PHASE 5 — last screen

### Portfolio ▸ My goal
Two panes: a sticky config panel on the left, results on the right.

**Config panel**
- Segmented "Goal" toggle: **Value | Passive income**. Switching it changes what the
  target and the projection mean — portfolio value in dollars vs annual dividend income.
- Target amount input with a currency selector, and a helper line beneath showing the
  current figure for comparison.
- "Achieve by" dropdown, e.g. "2050 (in 24 years)".
- "Contributions" field ($300 per month), computed total right-aligned, "$3,600.00 per
  year" beneath.
- Two collapsible sections, "Returns and inflation" and "Other", each with "+ Expand",
  holding the real assumptions: expected return, dividend growth rate, contribution
  growth rate, inflation, reinvest dividends, tax drag.
- A full-width "Save and calculate" button.

**Results**
- Progress ring with the percentage, beside "$30.37k / $685.00k Value".
- Verdict block: "Achievable in 12 years — By 2038".
- Projection chart 2026 → 2050, two lines (Portfolio, Safe scenario), a dashed goal line,
  and a marker where each line crosses it.
- A reward line, then assumption chips: Returns · Contributions $300.00 (▲3.5% annually) ·
  Reinvest dividends. Plus "More…" and an "All parameters and scenarios + Expand" row.
- Results table with the note "All forecasts are approximate. Future values are calculated
  from today's date." Columns: Year, Goal, Contributions ($/year over $/month), Portfolio
  (Value), Safe scenario (Value). First row labelled "today", then one row per year.

**What matters most** — the projection is real math. Chart, verdict, crossing markers and
every table row come from one projection function in the data module, seeded by the
current portfolio value and the config inputs. Changing a field and pressing "Save and
calculate" moves all of them together and keeps them consistent.

Point the Dashboard "My goal" card's "More →" link here, and make that card read from the
same projection function so the two can't disagree.

---

## PHASE 6 — remaining Portfolio screens

### Cash
Balances by currency, deposit and withdrawal history, cash drag %. The $2,000 cash line
and the ledger's cash-affecting rows are the source; "Update cash balance" on transactions
should be reflected here.

### Categories
User-defined buckets (e.g. Core, Dividend, Growth, Speculative) with an assignment UI and
allocation by category. The Dashboard allocation table already groups by category — this
screen is where those groupings are edited, so the two must share one definition.

### Corporate actions
Splits, mergers, ticker changes, special dividends. The New transaction modal's
"New corporate action" menu item should land here.

---

## PHASE 7 — Tools

### Portfolio rebalancing
Target vs current allocation per holding as horizontal bars with a target marker, drift %,
and the buy/sell dollar amount to reach target. A "new cash to invest" input that produces
buy-only suggestions. Targets come from the same definition the Dashboard allocation table
uses for its "target" secondary values.

### Top dividend stocks
Screener table: yield, payout ratio, growth streak, filters. Market-wide, not limited to
holdings.

### Dividend payout calendar
Market-wide upcoming ex-dates, distinct from Portfolio ▸ Dividend calendar which is
portfolio-limited.

### Portfolio Lab
Backtest builder: pick tickers and weights, choose a date range, produce an equity curve
vs benchmark with CAGR, max drawdown, and total dividends. Reuse the monthly history
engine.

### Find the Dip
Holdings and watchlist names trading below their moving average or off their 52-week high,
with % from high.

---

## Build notes
React + Tailwind, lucide-react, recharts. Responsive: top nav → hamburger + bottom tab bar
under 768px; wide tables → stacked cards preserving the two-tier pattern. Both themes on
every new screen. All interactions functional against the data module.
