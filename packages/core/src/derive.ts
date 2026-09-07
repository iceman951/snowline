/**
 * The derivation engine — a faithful port of the design bundle's
 * snowline-data.js.
 *
 * The rule the prototype set and this keeps: positions, constants and the
 * dividend history are the only stored facts. Category totals, allocation,
 * drift, day movers, the forward payment schedule, the dividend series and
 * the goal projection are all DERIVED here. No screen restates a figure.
 */

import type {
  Category,
  CategoryModel,
  Dataset,
  DividendHistory,
  ForwardMonth,
  GoalConfig,
  Holding,
  Movers,
  PaymentStatus,
  Position,
  Projection,
  ScheduleRow,
  TimelinePoint,
  Totals
} from './types.js';
import { EXCHANGES, LedgerEngine, parseDate } from './ledger.js';
import { HistoryEngine } from './history.js';
import { applyTransactions } from './transactions.js';
import { fmt } from './format.js';
import type { CalendarEvent, CalendarMonth } from './types.js';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const QUARTER_MONTHS: Record<string, 1> = { Mar: 1, Jun: 1, Sep: 1, Dec: 1 };

/** Payments already made in the current month, by ticker. */
const PAID_THIS_MONTH: Record<string, 1> = { JEPQ: 1, BIL: 1, DIMEFCD: 1 };

const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

export class Engine {
  readonly positions: Position[];
  readonly constants: Dataset['constants'];
  readonly dividendHistory: DividendHistory;
  readonly categoryTargets: Record<string, number>;
  /** Trade lots, income rows, corporate actions and price series. */
  readonly ledger: LedgerEngine;
  /** Solved monthly history and the cash walk. */
  readonly history: HistoryEngine;
  private readonly savedCategoryModel: CategoryModel | null;

  constructor(data: Dataset) {
    const applied = applyTransactions(data);
    this.positions = applied.positions;
    // Overlay market values after trades; opening lots and cost basis remain immutable.
    this.positions = this.positions.map(p => {
      const q = data.marketQuotes?.[p.ticker];
      if (!q || p.status !== 'open' || p.assetClass === 'Cash' || q.currency !== p.currency ||
          !Number.isFinite(q.price) || q.price <= 0 || !Number.isFinite(q.previousClose) || q.previousClose <= 0) return p;
      const value = p.shares * q.price;
      return { ...p, price: q.price, value,
        yieldPct: value > 0 ? p.value * p.yieldPct / value : 0,
        dayChangePct: (q.price / q.previousClose - 1) * 100,
        dayChangeAbs: p.shares * (q.price - q.previousClose) };
    });
    this.constants = data.constants;
    this.dividendHistory = applied.dividendHistory;
    this.categoryTargets = data.categoryTargets;
    this.savedCategoryModel = data.categoryModel ?? null;
    this.ledger = new LedgerEngine(
      data.positions,
      data.corporateActions ?? [],
      data.constants.withholdingTax,
      data.constants.today,
      data.transactions ?? []
    );
    this.history = new HistoryEngine(this.positions, data.constants, this.dividendHistory, {
      totals: () => this.totals(),
      ledger: () => this.ledger.ledger(),
      cashFloat: () => this.cashFloat(),
      annualGross: (p) => this.annualGross(p),
      money: (n) => fmt.money(n),
      shares: (n) => fmt.shares(n)
    });
  }

  /* ---- cash --------------------------------------------------------------
     Cash is a position like any other; what makes it its own screen is the
     weight it carries and what holding it costs against the goal's expected
     return. */

  cashPositions(): Position[] {
    return this.open().filter((p) => p.assetClass === 'Cash');
  }

  cashFloat(): number {
    return sum(this.cashPositions().map((p) => p.value));
  }

  /** Cash weight, what it yields, and the drag it puts on the whole portfolio. */
  cashStats() {
    const T = this.totals();
    const cash = this.cashFloat();
    const ps = this.cashPositions();
    const y = cash ? sum(ps.map((p) => p.value * p.yieldPct)) / cash : 0;
    const expected = this.goalConfig().expectedReturn * 100;

    // The target weight of whichever categories the cash lines sit in — the
    // Categories screen owns that number, not this one.
    const names: string[] = [];
    ps.forEach((p) => {
      const n = this.categoryOf(p.ticker);
      if (n && !names.includes(n)) names.push(n);
    });
    const m = this.categoryModel();
    const target = sum(names.map((n) => m.targets[n] ?? 0));
    const weight = T.value ? (cash / T.value) * 100 : 0;
    const gap = Math.max(0, expected - y);

    return {
      cash,
      weight,
      target,
      drift: weight - target,
      categoryNames: names,
      yieldPct: y,
      income: (cash * y) / 100,
      monthlyIncome: (cash * y) / 100 / 12,
      expectedReturn: expected,
      gap,
      dragPct: (weight / 100) * gap,
      dragAnnual: (cash * gap) / 100,
      positions: ps.map((p) => ({
        ticker: p.ticker,
        name: p.name,
        mono: p.mono,
        currency: p.currency,
        value: p.value,
        yieldPct: p.yieldPct,
        frequency: p.frequency,
        income: this.annualGross(p),
        monthly: this.annualGross(p) / 12,
        caveat: p.caveat,
        share: cash ? (p.value / cash) * 100 : 0
      }))
    };
  }

  /** Cash balances grouped by currency (only the base currency is held). */
  cashByCurrency() {
    const ps = this.cashPositions();
    const total = this.cashFloat();
    const map = new Map<string, {
      currency: string; balance: number; inBase: number; income: number; lines: string[];
    }>();

    ps.forEach((p) => {
      const c = map.get(p.currency) ?? {
        currency: p.currency, balance: 0, inBase: 0, income: 0, lines: []
      };
      c.balance += p.value;
      c.inBase += p.value * (p.fxToUsd || 1);
      c.income += this.annualGross(p);
      c.lines.push(p.ticker);
      map.set(p.currency, c);
    });

    return [...map.values()]
      .map((c) => ({
        ...c,
        pct: total ? (c.balance / total) * 100 : 0,
        yieldPct: c.balance ? (c.income / c.balance) * 100 : 0,
        isBase: c.currency === this.constants.baseCurrency
      }))
      .sort((a, b) => b.balance - a.balance);
  }

  /** Per-holding performance, for the horizontal bar chart. */
  holdingsPerformance() {
    return this.open()
      .map((p) => {
        const h = this.holding(p);
        const profit = p.value - p.costTotal + p.dividendsReceived + p.realizedPnL;
        const fees = Math.round(p.costTotal * 0.0009 * 100) / 100;
        return {
          ticker: p.ticker,
          name: p.name,
          mono: p.mono,
          totalProfit: profit,
          totalProfitPct: p.costTotal ? (profit / p.costTotal) * 100 : 0,
          capitalGain: p.value - p.costTotal,
          capitalGainPct: h.capitalGainPct,
          dividends: p.dividendsReceived,
          taxes: p.dividendsReceived / (1 - this.constants.withholdingTax) - p.dividendsReceived,
          fees,
          value: p.value,
          invested: p.costTotal
        };
      })
      .sort((a, b) => b.totalProfitPct - a.totalProfitPct);
  }

  /** Most recent payments for a holding, newest first. */
  dividendsFor(ticker: string, count = 6) {
    const p = this.byTicker(ticker);
    if (!p || !p.yieldPct || !p.shares) return [];
    const gross = p.frequency === 'Monthly' ? this.annualGross(p) / 12 : this.annualGross(p) / 4;
    const stepMonths = p.frequency === 'Monthly' ? 1 : 3;
    const out = [];
    for (let i = 1; i <= count; i++) {
      const back = i * stepMonths;
      let mi = this.constants.today.monthIndex - back;
      const year = this.constants.today.year + Math.floor(mi / 12);
      mi = ((mi % 12) + 12) % 12;
      out.push({
        payDate: `${p.frequency === 'Monthly' ? 4 : 22} ${MONTHS[mi]} ${year}`,
        perShare: gross / p.shares,
        gross,
        net: this.net(gross),
        status: 'Paid' as const
      });
    }
    return out;
  }

  /**
   * Cross-listings for the ticker combobox. Only the US line is a real
   * position; the others are the same company on other exchanges.
   */
  exchangesFor(ticker: string) {
    const p = this.byTicker(ticker);
    if (!p) return [];
    return EXCHANGES.map((e) => ({
      ticker: p.ticker,
      exchange: e.code,
      exchangeName: e.label,
      display: `${p.ticker} (${e.code})`,
      name: p.name,
      mono: p.mono,
      currency: e.cur,
      heldShares: e.code === 'US' && p.status === 'open' ? p.shares : 0
    }));
  }

  /* ---- helpers ---------------------------------------------------------- */

  open(): Position[] {
    return this.positions.filter((p) => p.status === 'open');
  }

  sold(): Position[] {
    return this.positions.filter((p) => p.status === 'sold');
  }

  /** Rounded to cents at source: a money column must sum to its own total. */
  annualGross(p: Position): number {
    return Math.round(p.value * p.yieldPct) / 100;
  }

  net(gross: number): number {
    return gross * (1 - this.constants.withholdingTax);
  }

  payers(): Position[] {
    return this.open().filter((p) => p.yieldPct > 0);
  }

  byTicker(t: string): Position | undefined {
    return this.positions.find((p) => p.ticker === t);
  }

  /* ---- categories ------------------------------------------------------- */

  /**
   * Seeded from each holding's sector with the stored target plan, so the
   * first time the Categories screen is opened nothing has moved.
   */
  categorySeed(): CategoryModel {
    const order = Object.keys(this.categoryTargets);
    const targets: Record<string, number> = {};
    const assign: Record<string, string> = {};
    order.forEach((n) => { targets[n] = this.categoryTargets[n]; });
    this.open().forEach((p) => {
      const name = p.sector;
      if (targets[name] === undefined) { targets[name] = 0; order.push(name); }
      assign[p.ticker] = name;
    });
    return { order, targets, assign };
  }

  /** The seed, overlaid with whatever the user saved. Never orphans a holding. */
  categoryModel(): CategoryModel {
    const seed = this.categorySeed();
    const saved = this.savedCategoryModel;
    if (!saved || !saved.order?.length || !saved.targets || !saved.assign) return seed;

    const order = saved.order.filter(
      (n, i) => typeof n === 'string' && n.length > 0 && saved.order.indexOf(n) === i
    );
    if (!order.length) return seed;

    const targets: Record<string, number> = {};
    const assign: Record<string, string> = {};
    order.forEach((n) => {
      const v = Number(saved.targets[n]);
      targets[n] = isFinite(v) ? Math.max(0, Math.round(v * 100) / 100) : 0;
    });
    this.open().forEach((p) => {
      let n = saved.assign[p.ticker];
      if (order.indexOf(n) < 0) {
        n = order.indexOf(seed.assign[p.ticker]) >= 0 ? seed.assign[p.ticker] : order[0];
      }
      assign[p.ticker] = n;
    });
    return { order, targets, assign };
  }

  categoryOf(ticker: string): string | null {
    return this.categoryModel().assign[ticker] || null;
  }

  targetTotal(): number {
    const m = this.categoryModel();
    return Math.round(sum(m.order.map((n) => m.targets[n])) * 100) / 100;
  }

  /**
   * Categories with drift against target. Largest first by default — the
   * dashboard's order — or in the user's own order with `ordered`.
   */
  categories(ordered = false): Category[] {
    const m = this.categoryModel();
    const openPositions = this.open();
    const value = sum(openPositions.map((p) => p.value));

    const list: Category[] = m.order.map((name, i) => {
      const hs = openPositions.filter((p) => m.assign[p.ticker] === name);
      const v = sum(hs.map((p) => p.value));
      const inv = sum(hs.map((p) => p.costTotal));
      const income = sum(hs.map((p) => this.annualGross(p)));
      const target = m.targets[name] || 0;
      const alloc = value ? (v / value) * 100 : 0;
      return {
        name,
        index: i,
        count: hs.length,
        tickers: hs.map((p) => p.ticker),
        value: v,
        invested: inv,
        gainAbs: v - inv,
        gainPctN: inv ? ((v - inv) / inv) * 100 : 0,
        income,
        yieldPct: v ? (income / v) * 100 : 0,
        allocN: alloc,
        targetN: target,
        driftN: alloc - target,
        targetValue: (value * target) / 100,
        deltaValue: (value * target) / 100 - v
      };
    });

    return ordered ? list : list.slice().sort((a, b) => b.value - a.value);
  }

  /* ---- derivations ------------------------------------------------------ */

  /** Received dividends by calendar month, oldest first. 2024 starts at Oct. */
  dividendTimeline(): TimelinePoint[] {
    const out: TimelinePoint[] = [];
    [2024, 2025, 2026].forEach((y) => {
      (this.dividendHistory[y] || []).forEach((v, i) => {
        if (y !== 2024 || v > 0) out.push({ label: MONTHS[i], year: String(y), v });
      });
    });
    return out;
  }

  totals(): Totals {
    const o = this.open();
    const value = sum(o.map((p) => p.value));
    const invested = sum(o.map((p) => p.costTotal));
    const shares = sum(o.map((p) => p.shares));
    const capitalGain = value - invested;
    const dayChange = sum(o.map((p) => p.dayChangeAbs));
    const gross = sum(o.map((p) => this.annualGross(p)));
    const lifetime = sum([2024, 2025, 2026].map((y) => sum(this.dividendHistory[y] || [])));
    const received = sum(this.positions.map((p) => p.dividendsReceived));
    const realized = sum(this.positions.map((p) => p.realizedPnL));
    const trailing = sum(this.dividendTimeline().slice(-12).map((x) => x.v));
    const profit = capitalGain + received + realized;

    return {
      value,
      invested,
      shares,
      capitalGain,
      capitalGainPct: (capitalGain / invested) * 100,
      dayChange,
      dayChangePct: (dayChange / (value - dayChange)) * 100,
      dividendsLifetime: lifetime,
      dividendsReceived: received,
      dividendsTrailing12: trailing,
      realizedPnL: realized,
      totalProfit: profit,
      totalProfitPct: (profit / invested) * 100,
      forwardGross: gross,
      forwardNet: this.net(gross),
      forwardMonthlyNet: this.net(gross) / 12,
      forwardDailyNet: this.net(gross) / 365,
      grossYield: (gross / value) * 100,
      netYield: (this.net(gross) / value) * 100,
      yieldOnCost: (gross / invested) * 100,
      holdings: o.length,
      soldCount: this.sold().length,
      categoryCount: this.categoryModel().order.length,
      goalProgressPct: (value / this.constants.goal.amount) * 100
    };
  }

  movers(): Movers {
    const up = this.open()
      .filter((p) => p.dayChangeAbs > 0)
      .sort((a, b) => b.dayChangePct - a.dayChangePct);
    const down = this.open()
      .filter((p) => p.dayChangeAbs < 0)
      .sort((a, b) => a.dayChangePct - b.dayChangePct);
    return {
      gainers: up,
      losers: down,
      gainSum: sum(up.map((p) => p.dayChangeAbs)),
      lossSum: sum(down.map((p) => p.dayChangeAbs))
    };
  }

  /** Per-holding figures used by the holdings table. */
  holding(p: Position): Holding {
    const t = this.totals();
    const name = this.categoryOf(p.ticker) || p.sector;
    const cat = this.categories().find((c) => c.name === name);
    const gain = p.value - p.costTotal;
    const profit = gain + p.dividendsReceived + p.realizedPnL;
    const gross = this.annualGross(p);
    return {
      p,
      capitalGain: gain,
      capitalGainPct: p.costTotal ? (gain / p.costTotal) * 100 : 0,
      totalProfit: profit,
      totalProfitPct: p.costTotal ? (profit / p.costTotal) * 100 : 0,
      annualGross: gross,
      annualNet: this.net(gross),
      perShareGross: p.shares ? gross / p.shares : 0,
      dividendsPerShare: p.shares ? p.dividendsReceived / p.shares : 0,
      yieldOnCost: p.costTotal ? (gross / p.costTotal) * 100 : 0,
      shareOfPortfolio: t.value ? (p.value / t.value) * 100 : 0,
      shareOfCategory: cat && cat.value ? (p.value / cat.value) * 100 : 0,
      categoryName: name
    };
  }

  holdings(includeSold = false): Holding[] {
    return (includeSold ? this.positions : this.open()).map((p) => this.holding(p));
  }

  /** Gross payments due in a given calendar month, largest first. */
  scheduleFor(month: string): ScheduleRow[] {
    return this.payers()
      .map((p): ScheduleRow | null => {
        if (p.frequency === 'Monthly') return { t: p.ticker, amt: this.annualGross(p) / 12 };
        if (QUARTER_MONTHS[month]) return { t: p.ticker, amt: this.annualGross(p) / 4 };
        return null;
      })
      .filter((r): r is ScheduleRow => r !== null)
      .sort((a, b) => b.amt - a.amt);
  }

  /**
   * Forward 12 months from the current month. Payments already made this
   * month are Paid, next month's are Declared, the rest Estimated.
   */
  forwardPayments(): ForwardMonth[] {
    const { today } = this.constants;
    const out: ForwardMonth[] = [];
    for (let i = 0; i < 12; i++) {
      const mi = (today.monthIndex + i) % 12;
      const year = today.year + Math.floor((today.monthIndex + i) / 12);
      const month = MONTHS[mi];
      const rows = this.scheduleFor(month).map((r) => {
        const status: PaymentStatus =
          i === 0 ? (PAID_THIS_MONTH[r.t] ? 'Paid' : 'Estimated') : i === 1 ? 'Declared' : 'Estimated';
        return { t: r.t, amt: r.amt, status };
      });
      out.push({
        m: month,
        year: String(year),
        label: month,
        full: `${month} ${year}`,
        total: sum(rows.map((r) => r.amt)),
        received: sum(rows.filter((r) => r.status === 'Paid').map((r) => r.amt)),
        rows
      });
    }
    return out;
  }

  paymentCountNext12(): number {
    return sum(this.payers().map((p) => (p.frequency === 'Monthly' ? 12 : 4)));
  }

  /* ---- dividend calendar ------------------------------------------------
     Day-level events for any month, projected from each payer's own known
     ex-date and pay-date and its frequency. Amounts come from the same
     annualGross() the rest of the app uses, so a month's total here agrees
     with the forward schedule. Status follows the same three states as the
     forward chart: everything up to today is Paid, next month is Declared,
     later months Estimated. --------------------------------------------- */

  private daysInMonth(y: number, mi: number): number {
    return new Date(y, mi + 1, 0).getDate();
  }

  private todayDay(): number {
    return parseDate(this.constants.today.label).d;
  }

  private payAnchor(p: Position) {
    return {
      pay: p.nextPayDate ? parseDate(p.nextPayDate) : null,
      ex: p.nextExDate ? parseDate(p.nextExDate) : null
    };
  }

  /** A quarterly payer only pays in months three apart from its anchor. */
  private paysInMonth(p: Position, mi: number): boolean {
    if (!p.yieldPct || p.status !== 'open') return false;
    if (p.frequency === 'Monthly') return true;
    const a = this.payAnchor(p);
    if (!a.pay) return false;
    return ((((mi - a.pay.m) % 3) + 3) % 3) === 0;
  }

  private clampDay(day: number, y: number, mi: number): number {
    return Math.min(day, this.daysInMonth(y, mi));
  }

  calendarMonth(year: number, mi: number): CalendarMonth {
    const { today } = this.constants;
    const rank = year * 12 + mi - (today.year * 12 + today.monthIndex);
    const td = this.todayDay();

    const events: CalendarEvent[] = [];
    this.payers().forEach((p) => {
      if (!this.paysInMonth(p, mi)) return;
      const a = this.payAnchor(p);
      const payDay = this.clampDay(a.pay ? a.pay.d : 15, year, mi);
      const exDay = this.clampDay(a.ex ? a.ex.d : Math.max(1, payDay - 3), year, mi);
      const gross = p.frequency === 'Monthly' ? this.annualGross(p) / 12 : this.annualGross(p) / 4;
      const status: PaymentStatus =
        rank < 0 ? 'Paid' : rank === 0 ? (payDay <= td ? 'Paid' : 'Declared') : rank === 1 ? 'Declared' : 'Estimated';

      events.push({
        ticker: p.ticker,
        name: p.name,
        mono: p.mono,
        frequency: p.frequency,
        shares: p.shares,
        yieldPct: p.yieldPct,
        status,
        day: payDay,
        exDay,
        exDate: `${exDay} ${MONTHS[mi]} ${year}`,
        payDate: `${payDay} ${MONTHS[mi]} ${year}`,
        gross,
        net: this.net(gross),
        perShare: p.shares ? gross / p.shares : 0
      });
    });
    events.sort((a, b) => a.day - b.day || b.gross - a.gross);

    const n = this.daysInMonth(year, mi);
    const days = [];
    for (let d = 1; d <= n; d++) {
      const onDay = events.filter((e) => e.day === d);
      days.push({
        day: d,
        events: onDay,
        gross: sum(onDay.map((e) => e.gross)),
        net: sum(onDay.map((e) => e.net)),
        isToday: rank === 0 && d === td
      });
    }

    const byStatus = (s: PaymentStatus) =>
      sum(events.filter((e) => e.status === s).map((e) => e.gross));

    return {
      year,
      monthIndex: mi,
      label: `${MONTHS[mi]} ${year}`,
      short: `${MONTHS[mi]} '${String(year).slice(2)}`,
      // Monday-first grid, so Sunday (0) becomes the last column.
      leadingBlanks: (new Date(year, mi, 1).getDay() + 6) % 7,
      days,
      events,
      gross: sum(events.map((e) => e.gross)),
      netTotal: sum(events.map((e) => e.net)),
      paid: byStatus('Paid'),
      declared: byStatus('Declared'),
      estimated: byStatus('Estimated'),
      count: events.length
    };
  }

  /** Twelve months of calendar totals, split by status for the bar chart. */
  calendarYear(year: number, mi: number): CalendarMonth[] {
    const out: CalendarMonth[] = [];
    for (let i = 0; i < 12; i++) {
      const m = mi + i;
      const y = year + Math.floor(m / 12);
      out.push(this.calendarMonth(y, ((m % 12) + 12) % 12));
    }
    return out;
  }

  /* ---- goal projection -------------------------------------------------- */

  goalDefaults(): Omit<GoalConfig, 'target'> {
    const { goal, withholdingTax, baseCurrency } = this.constants;
    return {
      mode: 'value',
      valueTarget: goal.amount,
      incomeTarget: 36000,
      byYear: goal.byYear,
      monthlyContribution: goal.monthlyContribution,
      contributionGrowth: 0.035,
      expectedReturn: goal.portfolioReturn,
      safeReturn: goal.safeReturn,
      dividendGrowth: 0.05,
      inflation: 0.025,
      reinvestDividends: goal.reinvestDividends,
      taxDrag: withholdingTax,
      currency: baseCurrency
    };
  }

  goalConfig(patch?: Partial<GoalConfig> | null): GoalConfig {
    const defaults = this.goalDefaults();
    const cfg = { ...defaults } as GoalConfig;

    if (patch && typeof patch === 'object') {
      const src = patch as Record<string, unknown>;
      const dst = cfg as unknown as Record<string, unknown>;
      (Object.keys(defaults) as Array<keyof typeof defaults>).forEach((k) => {
        let v = src[k];
        if (v === undefined || v === null || v === '') return;
        if (typeof defaults[k] === 'number') {
          v = Number(v);
          if (!isFinite(v as number)) return;
        }
        dst[k] = v;
      });
    }

    if (cfg.mode !== 'income') cfg.mode = 'value';
    cfg.byYear = Math.min(2100, Math.max(this.constants.today.year + 1, Math.round(cfg.byYear)));
    cfg.valueTarget = Math.max(1, cfg.valueTarget);
    cfg.incomeTarget = Math.max(1, cfg.incomeTarget);
    cfg.monthlyContribution = Math.max(0, cfg.monthlyContribution);
    cfg.taxDrag = Math.min(0.9, Math.max(0, cfg.taxDrag));
    cfg.target = cfg.mode === 'income' ? cfg.incomeTarget : cfg.valueTarget;
    return cfg;
  }

  /**
   * One engine behind the Dashboard's "My goal" card and the My goal screen.
   *
   * The month is the step, because the contribution is monthly. Value grows at
   * the PRICE return only — expected total return less the portfolio's own
   * current gross yield — so income is never counted twice.
   */
  projection(patch?: Partial<GoalConfig> | null): Projection {
    const cfg = this.goalConfig(patch);
    const T = this.totals();
    const v0 = T.value;
    const i0 = T.forwardGross;
    const y0 = i0 / v0;
    const span = cfg.byYear - this.constants.today.year;
    const target = cfg.target;
    const pick = (pt: { value: number; income: number }) => (cfg.mode === 'income' ? pt.income : pt.value);

    const run = (totalReturn: number, reinvest: boolean) => {
      const mPrice = Math.pow(1 + (totalReturn - y0), 1 / 12) - 1;
      const mDiv = Math.pow(1 + cfg.dividendGrowth, 1 / 12) - 1;
      let v = v0;
      let inc = i0;
      let rate = cfg.monthlyContribution;
      let contributed = 0;
      let dividends = 0;
      let taxes = 0;
      const pts = [
        { n: 0, value: v, income: inc, contributed: 0, dividends: 0, taxes: 0, monthly: rate, thisYear: 0 }
      ];
      const monthly = [{ value: v, income: inc }];

      for (let y = 0; y < span; y++) {
        for (let m = 0; m < 12; m++) {
          const gross = inc / 12;
          const netDiv = gross * (1 - cfg.taxDrag);
          dividends += gross;
          taxes += gross - netDiv;
          inc = inc * (1 + mDiv);
          v = v * (1 + mPrice);
          v += rate;
          contributed += rate;
          inc += rate * y0;
          if (reinvest) {
            v += netDiv;
            inc += netDiv * y0;
          }
          monthly.push({ value: v, income: inc });
        }
        pts.push({
          n: y + 1, value: v, income: inc, contributed, dividends, taxes, monthly: rate, thisYear: rate * 12
        });
        rate = rate * (1 + cfg.contributionGrowth);
      }
      return { pts, monthly };
    };

    /** Fractional years to the target, resolved to the month. */
    const crossOf = (monthly: Array<{ value: number; income: number }>): number | null => {
      for (let i = 1; i < monthly.length; i++) {
        const a = pick(monthly[i - 1]);
        const b = pick(monthly[i]);
        if (b >= target) return (i - 1 + (b === a ? 0 : (target - a) / (b - a))) / 12;
      }
      return null;
    };

    const port = run(cfg.expectedReturn, cfg.reinvestDividends);
    const altIncome = cfg.mode === 'income';
    const alt = altIncome
      ? run(cfg.expectedReturn, !cfg.reinvestDividends)
      : run(cfg.safeReturn, cfg.reinvestDividends);
    const altLabel = altIncome
      ? cfg.reinvestDividends
        ? 'Without reinvesting'
        : 'With reinvesting'
      : 'Safe scenario';

    const P = port.pts.map(pick);
    const S = alt.pts.map(pick);
    const cp = crossOf(port.monthly);
    const cs = crossOf(alt.monthly);
    const real = (v: number, n: number) => v / Math.pow(1 + cfg.inflation, n);

    const years = port.pts.map((pt, n) => ({
      n,
      year: this.constants.today.year + n,
      isToday: n === 0,
      goal: target,
      contributionYear: pt.thisYear,
      contributionMonthly: pt.monthly,
      contributedToDate: pt.contributed,
      dividends: pt.dividends,
      taxes: pt.taxes,
      value: pt.value,
      income: pt.income,
      portfolio: P[n],
      portfolioReal: real(P[n], n),
      safe: S[n],
      safeReal: real(S[n], n),
      reached: P[n] >= target,
      safeReached: S[n] >= target
    }));

    const end = P[span];
    const endSafe = S[span];

    return {
      cfg,
      mode: cfg.mode,
      modeLabel: cfg.mode === 'income' ? 'Passive income' : 'Value',
      altLabel,
      unit: cfg.mode === 'income' ? 'a year' : '',
      startValue: v0,
      startIncome: i0,
      startYield: y0 * 100,
      current: cfg.mode === 'income' ? i0 : v0,
      target,
      goal: target,
      byYear: cfg.byYear,
      span,
      startYear: this.constants.today.year,
      P,
      S,
      years,
      crossP: cp,
      crossS: cs,
      crossPYear: cp === null ? null : this.constants.today.year + Math.round(cp),
      crossSYear: cs === null ? null : this.constants.today.year + Math.round(cs),
      yearsToGoal: cp === null ? null : Math.round(cp),
      achievable: cp !== null,
      safeAchievable: cs !== null,
      progressPct: target ? Math.min(100, (cfg.mode === 'income' ? i0 / target : v0 / target) * 100) : 0,
      endValue: end,
      endSafe,
      endReal: real(end, span),
      endSafeReal: real(endSafe, span),
      shortfall: Math.max(0, target - end),
      totalContributions: port.pts[span].contributed,
      totalDividends: port.pts[span].dividends,
      totalTaxes: port.pts[span].taxes,
      rewardIncome: target * y0,
      rewardCapital: y0 ? target / y0 : 0
    };
  }

  /**
   * The smallest monthly contribution that would reach the goal: double until
   * one works, then bisect. Returns null when no contribution can close it —
   * which happens when the horizon is simply too short.
   */
  requiredContribution(cfg: GoalConfig): number | null {
    let lo = cfg.monthlyContribution;
    let hi = Math.max(200, cfg.monthlyContribution) * 2;

    for (let i = 0; i < 24; i++) {
      if (this.projection({ ...cfg, monthlyContribution: hi }).achievable) break;
      hi *= 2;
      if (hi > 5e7) return null;
    }
    if (!this.projection({ ...cfg, monthlyContribution: hi }).achievable) return null;

    for (let i = 0; i < 44; i++) {
      const mid = (lo + hi) / 2;
      if (this.projection({ ...cfg, monthlyContribution: mid }).achievable) hi = mid;
      else lo = mid;
    }
    return hi;
  }
}
