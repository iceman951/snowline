# Snowline — build spec (v4)

A portfolio & dividend tracker with the information architecture of Snowball Analytics,
rebuilt with an original minimal visual identity. Do not copy their logo, brand name,
purple/cyan palette, or emoji iconography.

**This is a continuation spec.** The app is nearly complete. Read the existing files in
the project before writing anything — especially `snowline-data.js`. This document
records the conventions in force and the work that remains.

---

## STATUS

Built and approved:

**Chrome & Dashboard** — top navigation, Dashboard (9 blocks)

**Analytics** — Common (the shared holdings table) · Diversification with the X-Ray Funds
look-through toggle · Dividends · Growth · Metrics (with the reusable `NumberLineGauge`)
· Report

**Portfolio** — Holdings · Transactions with the three-tab New transaction modal ·
Dividend calendar · My goal · Cash · Categories · Corporate actions

**Tools** — Portfolio rebalancing · Top dividend stocks · Dividend payout calendar

**Data module** — positions, 201-row transaction ledger, monthly history engine,
`riskStats()`, `riskVerdict()`, `projection()`, `goalConfig()`, `cashFlow()`,
`categories()`, `ledgerReconciliation()`, dividend schedules, look-through decomposition,
a 59-name screener universe

Remaining:
- **Tools ▸ Find the Dip**
- **Tools ▸ Portfolio Lab**
- Empty states for a brand-new portfolio on every screen that can be empty
- Loading skeletons matching each screen's real layout, not generic grey blocks
- A settings page consolidating the constants currently scattered across the module

Build one screen at a time and stop for review after each. Sessions have run out of
context when several screens were attempted at once.

---

## THE DATA MODULE IS THE SOURCE OF TRUTH

Every figure on every screen derives from `snowline-data.js`. No screen may hardcode a
value that contradicts it. When a screen needs a computation that doesn't exist, add it
to the module rather than computing locally. Where a computed result differs from a
figure written in an earlier spec, **the computed result wins** — assumptions are never
tuned backwards to reproduce a desired answer.

Current derived values:

    Value                 $30,374.48   ($28,431.28 invested, open positions)
    Total profit          +$3,989.53   ▲14.03%   ·  daily -$36.24 ▼0.12%
    Capital gain          +$1,943.20   ▲6.83%
    Dividends received    $1,467.21    after tax, lifetime · $1,293.02 trailing 12m
    IRR                   21.43%       (9.65% current holdings)
    TWR                   72.08%       vs SPY 84.82%, a 12.74pp gap
    Passive income        5.23%        $1,590.07 gross a year · $132.51 monthly
    Shares                2,354.588805 across 12 holdings
    Risk                  β 0.566 · Sharpe 0.949 · Sortino 2.103 · P/E 23.7x
                          risk-free 3.04% (the portfolio's own BIL yield)
                          window Oct 2024 – Aug 2026, 23 monthly returns, lifetime only
    Ledger                201 transactions, 14 instruments (TSM and XOM closed)
                          $31,104.94 buys · $3,126.90 sells · $30.81 fees
    Cash                  $2,000.00 float, 6.58% of the portfolio, derived from the
                          ledger: 30 deposits ($32,650.00), 4 withdrawals ($4,108.36)
    Goal                  $685,000 target, 4.43% progress, 9.00% expected return /
                          5.00% safe. On $300/month it is NOT reached by 2050 —
                          short $69,599.44; $355.49/month closes it.
    Corporate actions     8 events, 7 types, 4 restated a position;
                          `ledgerReconciliation()` returns zero breaks on 14 instruments
    Universe              59 names, 58 payers, 12 sectors, median yield 3.27%

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
    plus a $2,000 cash line (DIMEFCD money-market, manually priced)

Payment frequency: JEPQ, QQQI, GLDI, SLVO, BIL, DIMEFCD monthly; the rest quarterly.
Withholding tax 15%. Base currency USD. Portfolio "US Core", as of 30 Aug 2026.

Synthetic data must be plausible per instrument. Ledger prices sit in tight bands for
cash-like holdings and wider ones for equities; a name trading near its 52-week high must
not simultaneously read as far below its 200-day average.

---

## OWNERSHIP OF SHARED MODELS

Several screens read the same model. Each has exactly one owner; the others read it.

- **Target allocation** — owned by Portfolio ▸ Categories. Read by the Dashboard
  allocation table, the holdings table's share-of-category, the Cash screen's 5% cash
  target, and Tools ▸ Portfolio rebalancing. Editing a target on Categories changes all
  of them.
- **Goal projection** — one `projection()` in the module feeds the My goal screen and the
  Dashboard's My goal card.
- **Cash float** — the Cash screen's $2,000 float governs what rebalancing may spend.
  Cash sits exactly at the float while its 5% target values it at $1,518.72, so the
  $481.28 "above target" is not freely spendable; rebalancing caps buys at what sales
  raise and offers a toggle that spends the surplus with a warning.
- **Screener universe** — shared by Top dividend stocks, Dividend payout calendar, and
  (next) Find the Dip and Portfolio Lab. The 12 holdings carry the same figures there as
  everywhere else in the app.

---

## ESTABLISHED CONVENTIONS

### Color
- Light: canvas #FAFAF9, cards #FFFFFF, text #171717 / #737373 / #A3A3A3,
  hairlines #E7E5E4.
- Dark: canvas #0C0C0C, cards #171717, text #FAFAF9 / #A3A3A3 / #737373,
  hairlines #292524, plus `--track` and `--tick` for chart rails and ticks, read as
  `var(--tick, var(--line))` so components degrade safely.
- One accent: #0F7B57 light / #34D399 dark. Loss red #B91C1C / #F87171.
- Multi-series and multi-slice charts use a **monochrome ramp** from the accent to
  mid-grey, ordered by size. Never a rainbow, never an off-palette hue for one category.
  Amber only as a thin left border, a small warning glyph, or a low-opacity chip.

### Typography and numbers
- Inter or similar neutral sans. Scale 32/24/16/14/12. Weights 400/500/600.
- **Tabular figures everywhere.**
- Gains and losses: small caret glyph plus color, never a colored pill background.
- Never surface raw floats — format for display (2 decimals for prices, up to 6 for
  fractional shares).

### The two-tier value pattern
Nearly every number is a primary value with a muted 12px secondary beneath it in the same
cell. This is the defining rule of the design system. Reuse `<Metric>` and `<TwoLineCell>`
rather than writing new markup. `TwoLineCell` handles ellipsis truncation.

### Charts
- Flat-topped bars, dashed hairline gridlines.
- **Round y-axis ticks.** **Symmetric diverging axes.**
- Rich hover cards via `<ChartTooltip>`: title, headline value, labeled rows.
- Log scales where the range demands, but labeled.

### Layout and tables
- Desktop-first at 1440px; verify at 1280px. No horizontal page overflow.
- Wide tables scroll horizontally with the first column frozen and **opaque**.
- Sortable headers; dotted underline on anything carrying a tooltip.
- Every control works against the data module — no decorative inputs.
- Modals prefill from the row being edited, and footer text reflects the actual action.
- Filtered views recompute their summary statistics.

### Screen anatomy
- Page head: H1, portfolio name beside it, a metadata line beneath, "…" overflow right.
- Each screen carries a **footnote explaining its own model** and stating any rule it
  chose — how cash deposits are solved, how splits touch cost basis, how legs are
  apportioned. This is a house convention now; keep it.
- Distinguish a no-results state from a true empty state.
- Surface controls on screen; anything reachable only through a host tweaks overlay is
  invisible in practice.
- Theme toggle lives in the avatar menu, persisted via `data-theme`.
- No emoji as UI elements. No marketing copy in the app shell. Upsells stay restrained.
- **Wire nav links as you go.**

---

## REMAINING WORK

### Tools ▸ Find the Dip
Holdings and watchlist names trading below their moving averages or off their 52-week
high.
- Columns: Ticker/Name, Price, % from 52-week high, % from the 50-day and 200-day moving
  averages, yield, sector, held or not. Two-tier cells — e.g. the 52-week column showing
  the % below alongside the high itself.
- Filters: how far off the high, held / watchlist / all, sector. Sortable, default sorted
  by depth of drawdown.
- Add 52-week range and 50/200-day moving averages to the screener universe, consistent
  with the prices already in use.
- Mark held names as the screener does, and link through to the holding.
- Footnote explaining what the moving averages are computed from and over what window.

### Tools ▸ Portfolio Lab
A backtest builder.
- Compose a hypothetical portfolio: pick tickers from the universe, set weights, choose a
  date range and starting amount, optionally a monthly contribution.
- A "load my portfolio" action seeding it with the current 12 positions at their actual
  weights.
- Output: an equity curve against a benchmark, plus CAGR, total return, max drawdown,
  volatility, Sharpe, and total dividends collected. Reuse the monthly history engine and
  the risk functions from Analytics ▸ Metrics rather than writing new ones.
- Weights must sum to 100%, flagged the way Categories does it.
- Two or three saved scenarios side by side for comparison.
- Be honest about the data: state what the returns derive from and over what window, and
  don't imply precision the synthetic history lacks. The risk window is lifetime-only
  elsewhere in the app because short slices produce misleading statistics — carry that
  judgement here.

### Empty states
For a brand-new portfolio, on every screen that can be empty: no holdings, no
transactions, no dividends, no corporate actions, no categories, no cash movements. Each
should say what to do next, not merely that there's nothing here.

### Loading skeletons
Matching each screen's real layout — KPI rows, table shapes, chart areas — not generic
grey blocks.

### Settings page
Base currency, withholding tax rate, benchmark, theme, minimum trade size, cash float,
and the goal assumptions. These are currently scattered as constants; the settings page
becomes the place they're edited and every screen reads from it. This is the final test
of whether the data module was designed well.

---

## Build notes
React + Tailwind, lucide-react, recharts. Responsive: top nav → hamburger + bottom tab
bar under 768px; wide tables → stacked cards preserving the two-tier pattern. Both themes
on every new screen. All interactions functional against the data module.
