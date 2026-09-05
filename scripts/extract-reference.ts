/**
 * Regenerates the seed facts and the parity reference from the design bundle.
 *
 *   bun run scripts/extract-reference.ts
 *
 * It loads the prototype's snowline-data.js in a fake browser and dumps:
 *   apps/api/src/db/seed-data.json   — the raw hand-entered facts
 *   packages/core/test/reference.json — the derived figures the port must match
 *
 * Run this only when the design bundle changes. The bundle is the acceptance
 * criteria; nothing here is edited by hand.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = join(root, 'snowline/project/snowline-data.js');

const src = await Bun.file(BUNDLE).text();

const store = new Map<string, string>();
const fakeWindow: any = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k)
  }
};
(globalThis as any).window = fakeWindow;

new Function('window', src)(fakeWindow);

const D = fakeWindow.SnowlineData;
if (!D) throw new Error('SnowlineData did not attach — has the bundle changed shape?');

await Bun.write(
  join(root, 'apps/api/src/db/seed-data.json'),
  JSON.stringify(
    {
      positions: D.positions,
      constants: D.constants,
      dividendHistory: D.dividendHistory,
      categoryTargets: D.categoryTargets,
      corporateActions: D.corporateActions
    },
    null,
    2
  )
);

const T = D.totals();
const pr = D.projection();

await Bun.write(
  join(root, 'packages/core/test/reference.json'),
  JSON.stringify(
    {
      totals: T,
      categories: D.categories().map((c: any) => ({
        name: c.name, count: c.count, value: c.value, invested: c.invested,
        gainAbs: c.gainAbs, gainPctN: c.gainPctN,
        allocN: c.allocN, targetN: c.targetN, driftN: c.driftN
      })),
      movers: {
        gainSum: D.movers().gainSum,
        lossSum: D.movers().lossSum,
        gainers: D.movers().gainers.map((p: any) => p.ticker),
        losers: D.movers().losers.map((p: any) => p.ticker)
      },
      forwardPayments: D.forwardPayments().map((m: any) => ({
        full: m.full, total: m.total, received: m.received, rows: m.rows.length
      })),
      paymentCountNext12: D.paymentCountNext12(),
      dividendTimeline: D.dividendTimeline(),
      projection: {
        current: pr.current, target: pr.target, progressPct: pr.progressPct,
        achievable: pr.achievable, yearsToGoal: pr.yearsToGoal,
        crossPYear: pr.crossPYear, crossSYear: pr.crossSYear,
        span: pr.span, startYear: pr.startYear,
        endValue: pr.endValue, endSafe: pr.endSafe, shortfall: pr.shortfall,
        P: pr.P, S: pr.S
      },
      holdings: D.holdings(true).map((h: any) => ({
        ticker: h.p.ticker, capitalGain: h.capitalGain, capitalGainPct: h.capitalGainPct,
        totalProfit: h.totalProfit, totalProfitPct: h.totalProfitPct,
        annualGross: h.annualGross, annualNet: h.annualNet,
        perShareGross: h.perShareGross, dividendsPerShare: h.dividendsPerShare,
        yieldOnCost: h.yieldOnCost, shareOfPortfolio: h.shareOfPortfolio,
        shareOfCategory: h.shareOfCategory, categoryName: h.categoryName
      })),
      ledger: D.ledger().map((r: any) => ({
        id: r.id, kind: r.kind, operation: r.operation, ticker: r.ticker, date: r.date,
        shares: r.shares, price: r.price, amount: r.amount, fee: r.fee, tax: r.tax, signed: r.signed
      })),
      ledgerTotals: D.ledgerTotals(),
      ledgerReconciliation: D.ledgerReconciliation(),
      corporateActionLog: D.corporateActionLog(),
      corporateActionStats: D.corporateActionStats(),
      transactionsFor: Object.fromEntries(
        D.positions.map((p: any) => [p.ticker, D.transactionsFor(p.ticker)])
      ),
      dividendsFor: Object.fromEntries(
        D.positions.map((p: any) => [p.ticker, D.dividendsFor(p.ticker, 5)])
      ),
      priceSeries: Object.fromEntries(
        D.positions.map((p: any) => [p.ticker, D.priceSeries(p.ticker, 60)])
      )
    },
    null,
    2
  )
);

console.log(`positions ${D.positions.length} · value ${T.value.toFixed(2)} · income ${T.forwardGross.toFixed(2)}`);
