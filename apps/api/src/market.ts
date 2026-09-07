import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import type { Database } from 'bun:sqlite';
import type { Dataset } from '@snowline/core';
import { getDb } from './db/index.js';

type Quotes = NonNullable<Dataset['marketQuotes']>;
type Row = { ticker: string; quote_json: string | null; fetched_at: number | null; attempted_at: number; failed: number };
export const thaiDay = (time: number) => new Date(time + 7 * 3600_000).toISOString().slice(0, 10);
export const marketEnabled = () => process.env.SNOWLINE_PRICES !== 'seed' && process.env.NODE_ENV !== 'test';

export async function fetchQuotes(symbols: string[]): Promise<Quotes> {
  const local = fileURLToPath(new URL('../../../.venv/Scripts/python.exe', import.meta.url));
  const unix = fileURLToPath(new URL('../../../.venv/bin/python', import.meta.url));
  const python = process.env.SNOWLINE_PYTHON ?? (existsSync(local) ? local : existsSync(unix) ? unix : 'python');
  const child = Bun.spawn([python, fileURLToPath(new URL('../scripts/quotes.py', import.meta.url))],
    { stdin: new Blob([JSON.stringify(symbols)]), stdout: 'pipe', stderr: 'pipe' });
  const timer = setTimeout(() => child.kill(), 60_000);
  try {
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    if (code !== 0) throw new Error(stderr.trim() || 'yfinance timed out');
    return JSON.parse(stdout);
  } finally { clearTimeout(timer); }
}

/** One coordinator per database; successful prices and retry times survive restart. */
export class MarketCache {
  private pending?: Promise<void>;
  constructor(private db: Database, private fetcher = fetchQuotes, private now = Date.now) {}
  private rows(): Row[] { return this.db.query<Row, []>('SELECT * FROM market_quotes').all(); }
  quotes(): Quotes {
    return Object.fromEntries(this.rows().filter(r => r.quote_json).map(r => [r.ticker, JSON.parse(r.quote_json!)]));
  }
  status(symbols: string[]) {
    const rows = new Map(this.rows().map(r => [r.ticker, r]));
    const entries = [...new Set(symbols)].map(ticker => {
      const row = rows.get(ticker);
      const quote = row?.quote_json ? JSON.parse(row.quote_json) : null;
      return { ticker, asOf: quote?.asOf ?? null,
        fetchedAt: row?.fetched_at ? new Date(row.fetched_at).toISOString() : null,
        state: !quote ? 'stored' : thaiDay(row!.fetched_at!) !== thaiDay(this.now()) || row!.failed ? 'stale' : 'cached' };
    });
    return { source: 'yfinance', refreshing: !!this.pending, entries,
      error: entries.some(e => rows.get(e.ticker)?.failed === 1)
        ? 'ดึงราคาบางรายการไม่สำเร็จ กำลังใช้ราคาที่มีอยู่' : null };
  }
  async ensure(symbols: string[], force = false): Promise<{ retryAfter: number }> {
    while (this.pending) await this.pending;
    const now = this.now();
    if (force) {
      const last = this.db.query<{ attempted_at: number }, []>('SELECT attempted_at FROM market_refresh WHERE id = 1').get();
      if (last && now - last.attempted_at < 60_000) return { retryAfter: Math.ceil((60_000 - now + last.attempted_at) / 1000) };
      this.db.run('INSERT INTO market_refresh VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET attempted_at = excluded.attempted_at', [now]);
    }
    const rows = new Map(this.rows().map(r => [r.ticker, r]));
    const needed = [...new Set(symbols)].filter(ticker => {
      const row = rows.get(ticker);
      if (force || !row) return true;
      if (row.failed && now - row.attempted_at < 300_000) return false;
      return !!row.failed || !row.fetched_at || thaiDay(row.fetched_at) !== thaiDay(now);
    });
    if (!needed.length) return { retryAfter: 0 };
    this.pending = this.update(needed);
    try { await this.pending; } finally { this.pending = undefined; }
    return { retryAfter: 0 };
  }
  private async update(symbols: string[]) {
    let result: Quotes = {};
    try { result = await this.fetcher(symbols); }
    catch (error) { console.error('yfinance:', error); }
    const now = this.now();
    const currencies = new Map(this.db.query<{ ticker: string; currency: string }, []>('SELECT ticker, currency FROM positions').all().map(r => [r.ticker, r.currency]));
    this.db.transaction(() => {
      for (const ticker of symbols) {
        const q = result?.[ticker];
        const valid = q && Number.isFinite(q.price) && q.price > 0 && Number.isFinite(q.previousClose) && q.previousClose > 0 &&
          typeof q.currency === 'string' && q.currency === (currencies.get(ticker) ?? 'USD') && Number.isFinite(Date.parse(q.asOf));
        if (valid) this.db.run('INSERT INTO market_quotes VALUES (?, ?, ?, ?, 0) ON CONFLICT(ticker) DO UPDATE SET quote_json=excluded.quote_json, fetched_at=excluded.fetched_at, attempted_at=excluded.attempted_at, failed=0',
          [ticker, JSON.stringify(q), now, now]);
        else this.db.run('INSERT INTO market_quotes VALUES (?, NULL, NULL, ?, 1) ON CONFLICT(ticker) DO UPDATE SET attempted_at=excluded.attempted_at, failed=1', [ticker, now]);
      }
    })();
  }
}
const caches = new WeakMap<Database, MarketCache>();
export function marketCache() {
  const db = getDb();
  let cache = caches.get(db);
  if (!cache) { cache = new MarketCache(db); caches.set(db, cache); }
  return cache;
}
export const cachedQuotes = (): Quotes => marketEnabled() ? marketCache().quotes() : {};

