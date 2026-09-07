# Daily market-price cache

Snowline fetches the latest unadjusted daily Close and the preceding trading
session's Close through Python yfinance. This is daily data, not streaming prices.
Price-dependent API reads await missing/outdated quotes before calculating the
response. Holdings reads request portfolio symbols; research reads also request
the research catalog. Cash is excluded.

SQLite stores one latest successful quote per ticker, its currency, market date,
fetch timestamp and last attempt outcome. A successful fetch is reused for the
rest of that calendar day in Asia/Bangkok, including after an API restart.
Weekends may return the same market date: quote date and fetch time are displayed
separately. No startup download, periodic price timer or cron is required.

Concurrent requests share ongoing work and then recheck any additional symbols.
Failures retain the last successful quote (or original stored price), with a
five-minute automatic retry backoff. Invalid or currency-mismatched quotes are
treated as failed fetches. Dates and fallback states are visible per ticker.

`GET /api/market/status` reads status without fetching prices. The refresh button
calls `POST /api/market/refresh`, bypasses daily freshness, and reloads the current
page data. Repeated manual refreshes within 60 seconds return HTTP 429 and a
`Retry-After` header. Partial failures are reported while successful quotes are
still applied. Both cooldowns persist in SQLite.

## Setup

Install Python 3.10+ and create the project virtual environment:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r apps/api/requirements.txt
bun run dev
```

The API automatically detects `.venv/Scripts/python.exe` on Windows or
`.venv/bin/python` elsewhere. Override with `SNOWLINE_PYTHON` if needed; otherwise
it falls back to `python` on PATH. Missing Python/dependencies result in visible
fallback status rather than a failed portfolio request. The SQLite tables are
created automatically; existing positions do not need to be reseeded.

Set `SNOWLINE_PRICES=seed` for deterministic demo data. Tests disable real quote
fetches automatically and exercise the cache with an injected provider and clock.

Quotes update current holdings, totals and research catalog prices. Cost basis
and ledger records remain unchanged. Yield is recalculated to preserve existing
projected payouts. Dividend facts, FX, synthetic history charts and research
metrics still use the existing dataset; daily price history is not accumulated.

Provider reference: https://ranaroussi.github.io/yfinance/reference/api/yfinance.Ticker.history.html
