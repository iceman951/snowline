import { rebalance, type RebalanceConfig, MONTHS, Engine, createResearchEngine, fmt, type ResearchPreferences } from '@snowline/core';
import type { ResearchSnapshot } from './api';

/** One isolated engine per page snapshot. All calculations use the shared core. */
export function createScreenEngine(snapshot: ResearchSnapshot, save: (patch: Partial<ResearchPreferences>) => void = () => {}) {
  const engine = new Engine(snapshot.dataset);
  let preferences = structuredClone(snapshot.preferences);
  const research = createResearchEngine(engine, snapshot.catalog);
  const update = (patch: Partial<ResearchPreferences>) => {
    preferences = { ...preferences, ...patch };
    save(patch);
  };
  // Bind methods explicitly because the history and ledger engines are separate
  // modules in the app. Presenters consume a consistent read-only interface.
  return {
    ...research, fmt, MONTHS, rebalance: (config: RebalanceConfig) => rebalance(engine, config), constants: engine.constants, positions: engine.positions,
    dividendHistory: engine.dividendHistory,
    open: () => engine.open(), sold: () => engine.sold(), payers: () => engine.payers(),
    totals: () => engine.totals(), holding: engine.holding.bind(engine), holdings: engine.holdings.bind(engine),
    byTicker: engine.byTicker.bind(engine), annualGross: engine.annualGross.bind(engine), net: engine.net.bind(engine),
    categories: engine.categories.bind(engine), categoryOf: engine.categoryOf.bind(engine),
    categoryModel: engine.categoryModel.bind(engine), targetTotal: engine.targetTotal.bind(engine),
    forwardPayments: () => engine.forwardPayments(), dividendTimeline: () => engine.dividendTimeline(),
    scheduleFor: engine.scheduleFor.bind(engine), paymentCountNext12: () => engine.paymentCountNext12(),
    cashStats: () => engine.cashStats(), cashFloat: () => engine.cashFloat(), cashByCurrency: () => engine.cashByCurrency(),
    cashFlow: () => engine.history.cashFlow(), cashPositions: () => engine.cashPositions(),
    history: () => engine.history.history(), historyRange: engine.history.historyRange.bind(engine.history),
    monthSpan: () => engine.history.monthSpan(), monthlyReturns: engine.history.monthlyReturns.bind(engine.history),
    holdingsPerformance: () => engine.holdingsPerformance(), benchmarkValuePath: () => engine.history.benchmarkValuePath(),
    ledger: () => engine.ledger.ledger(), ledgerTotals: engine.ledger.ledgerTotals.bind(engine.ledger),
    goalConfig: () => engine.goalConfig(snapshot.goalConfig), projection: () => engine.projection(snapshot.goalConfig),
    watchlist: () => preferences.watchlist,
    toggleWatch: (ticker: string) => {
      const watchlist = preferences.watchlist.includes(ticker) ? preferences.watchlist.filter(t => t !== ticker) : [...preferences.watchlist, ticker];
      update({ watchlist });
      return watchlist;
    },
    saveWatchlist: (watchlist: string[]) => { update({ watchlist }); return watchlist; },
    labScenarios: () => preferences.scenarios,
    saveLabScenarios: (scenarios: ResearchPreferences['scenarios']) => { update({ scenarios }); return scenarios; },
    clearLabScenarios: () => { update({ scenarios: null }); return null; }
  };
}
