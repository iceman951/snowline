"""JSON stdin/stdout bridge; stdout is reserved for the response."""
import contextlib
import json
import math
import sys
from concurrent.futures import ThreadPoolExecutor

with contextlib.redirect_stdout(sys.stderr):
    import yfinance as yf


def fetch(symbol):
    try:
        ticker = yf.Ticker(symbol)
        history = ticker.history(period="5d", auto_adjust=False, timeout=10)
        closes = history["Close"].dropna()
        if len(closes) < 2:
            return symbol, None
        price, previous = float(closes.iloc[-1]), float(closes.iloc[-2])
        currency = ticker.history_metadata.get("currency")
        if not currency or not all(math.isfinite(v) and v > 0 for v in (price, previous)):
            return symbol, None
        return symbol, dict(price=price, previousClose=previous, currency=currency,
                            asOf=closes.index[-1].isoformat())
    except Exception as error:
        print(f"{symbol}: {error}", file=sys.stderr)
        return symbol, None


symbols = json.loads(sys.stdin.buffer.read().decode('utf-8-sig'))
with contextlib.redirect_stdout(sys.stderr):
    with ThreadPoolExecutor(max_workers=4) as pool:
        quotes = {symbol: quote for symbol, quote in pool.map(fetch, symbols) if quote}
print(json.dumps(quotes, allow_nan=False))
