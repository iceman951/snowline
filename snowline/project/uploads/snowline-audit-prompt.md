Before building anything new, audit the whole app. Read every file in the project first.

Community has been removed from the navigation — treat it as out of scope, and make sure
no link, menu item, or route still points at it.

## What I want

A written audit report in your reply, then a fix pass. Do not start fixing until the
report is written — I want to see the shape of what's missing before you touch anything.

## Part 1 — Screen inventory

Go through every destination reachable from the navigation and confirm it exists, renders,
and is wired. For each, report: exists / missing / placeholder, and whether the nav link
actually navigates there.

Top nav: Dashboard · Analytics · Portfolio · Tools
Analytics: Common · Diversification · Dividends · Growth · Metrics · Report
Portfolio: Holdings · Transactions · Dividend calendar · My goal · Cash · Categories ·
  Corporate actions
Tools: Portfolio rebalancing · Top dividend stocks · Dividend payout calendar ·
  Portfolio Lab · Find the Dip

Also check the non-nav destinations: the holding detail side panel, the New transaction
modal, the Add corporate action sheet, the Add investments menu items, the avatar menu,
the portfolio selector, the currency selector, the search field, the star/favourites icon,
and the Insights button in the top bar. Several of these were built early and may still be
inert — say which are real and which do nothing.

## Part 2 — Feature audit per screen

For each screen, list its interactive controls and mark each one working / partially
working / inert. Be specific and honest — an inert control that looks real is worse than
an absent one. Pay particular attention to controls that were built before their
destination existed.

Check especially:
- Every filter, sort, search field, view toggle, tab, dropdown, and checkbox.
- Every "see details", "view details", "more", and "→" link — where does it actually go?
- Row click behaviour on every table.
- Export, import, and download buttons.
- Empty states and loading states — which screens have them, which don't.

## Part 3 — Consistency check

- Does every screen read from snowline-data.js, or does any still hold a figure of its
  own? Name any contradiction.
- Do light and dark mode both work on every screen?
- Does every screen hold at 1440px and 1280px without horizontal page overflow, with
  frozen first columns where tables are wide?
- Are the two-tier value pattern, the monochrome chart ramp, round axis ticks, and
  tabular figures applied everywhere, or are there screens that drifted?
- Is anything still showing a raw float, a truncated string without an ellipsis, or a
  date rendered wrong?

## Part 4 — Then fix

Once the report is written, fix in this order and tell me what you did:
1. Dead links and inert controls that should work — these are the worst, because they
   look finished.
2. Anything reachable but visibly broken.
3. Consistency drift.

If a control genuinely shouldn't exist yet, remove it rather than leaving it dead. If
something is a real gap that needs a screen or a substantial feature built, list it
separately and stop — I'll decide whether to build it rather than have it appear inside a
fix pass.

Do not build Portfolio Lab or the remaining cross-cutting work (empty states, loading
skeletons, settings page) as part of this — those are known and scheduled.
