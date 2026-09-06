/**
 * Monthly history and the cash walk — ported from snowline-data.js.
 *
 * One engine behind Growth, Metrics and Report. Everything is solved, not
 * stored, and it is pinned at both ends:
 *
 *   cumulative deposits  ends at the real cost basis   $28,431.28
 *   portfolio value      ends at the real market value $30,374.48
 *   chain-linked return  ends at constants.twr          72.08%
 *
 * Those three only reconcile if the gains came early on little capital and the
 * deposits came late — which is also what makes IRR (21.43%) sit far above the
 * simple value/cost gain (+6.83%). So the return path is front-loaded and the
 * deposit path is solved for: a single blend factor between "all money in at
 * the start" and "all money in at the end" is bisected until the value line
 * lands exactly on today's total.
 */

import { MONTHS, parseDate, seeded } from './ledger.js';
import type {
  CashFlow,
  CashRow,
  Constants,
  DividendHistory,
  HistoryMonth,
  LedgerRow,
  MonthKey,
  Position
} from './types.js';

const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

/** The portfolio opened in Oct 2024. */
export const HISTORY_START = { year: 2024, monthIndex: 9 };

const RANGE_MONTHS: Record<string, number | null> = {
  '7d': 1, '1m': 1, '3m': 3, '6m': 6, YTD: null, '1y': 12, '5y': 60, all: null
};

/** Monthly returns whose product equals `totalReturn`, front-loaded. */
export function returnPath(seed: string, n: number, totalReturn: number): number[] {
  const rnd = seeded(seed);
  const raw: number[] = [];
  for (let i = 0; i < n; i++) {
    // Early months move more.
    const decay = Math.pow(1 - i / n, 1.6);
    raw.push((rnd() - 0.38) * 0.09 * (0.35 + decay));
  }
  const prod = raw.reduce((s, r) => s * (1 + r), 1);
  const k = Math.pow((1 + totalReturn) / prod, 1 / n);
  return raw.map((r) => (1 + r) * k - 1);
}

export class HistoryEngine {
  private historyCache: HistoryMonth[] | null = null;
  private cashCache: CashFlow | null = null;

  constructor(
    private readonly positions: Position[],
    private readonly constants: Constants,
    private readonly dividendHistory: DividendHistory,
    private readonly deps: {
      totals: () => { invested: number; value: number };
      ledger: () => LedgerRow[];
      cashFloat: () => number;
      annualGross: (p: Position) => number;
      money: (n: number) => string;
      shares: (n: number) => string;
    }
  ) {}

  /** Every month from the portfolio's first to today, inclusive. */
  monthSpan(): MonthKey[] {
    const out: MonthKey[] = [];
    let y = HISTORY_START.year;
    let m = HISTORY_START.monthIndex;
    const { today } = this.constants;
    while (y < today.year || (y === today.year && m <= today.monthIndex)) {
      out.push({
        year: y,
        monthIndex: m,
        label: MONTHS[m],
        key: `${MONTHS[m]} ${y}`,
        short: `${MONTHS[m]} '${String(y).slice(2)}`
      });
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
    return out;
  }

  private dividendAt(year: number, monthIndex: number): number {
    return this.dividendHistory[year]?.[monthIndex] ?? 0;
  }

  history(): HistoryMonth[] {
    if (this.historyCache) return this.historyCache;

    const months = this.monthSpan();
    const n = months.length;
    const T = this.deps.totals();
    const targetDeposits = T.invested;
    const targetValue = T.value;

    const r = returnPath('twr', n, this.constants.twr / 100);
    const b = returnPath('spy', n, this.constants.benchmarkTwr / 100);

    // Two deposit shapes, blended by theta and solved by bisection.
    let early: number[] = [];
    let late: number[] = [];
    for (let i = 0; i < n; i++) {
      early.push(Math.pow(1 - i / n, 2.2) + 0.02);
      late.push(Math.pow((i + 1) / n, 2.6) + 0.02);
    }
    const norm = (a: number[]) => {
      const s = sum(a);
      return a.map((v) => v / s);
    };
    early = norm(early);
    late = norm(late);

    const run = (theta: number) => {
      let v = 0;
      const dep: number[] = [];
      const vals: number[] = [];
      for (let j = 0; j < n; j++) {
        const d = targetDeposits * (theta * early[j] + (1 - theta) * late[j]);
        dep.push(d);
        v = (v + d) * (1 + r[j]);
        vals.push(v);
      }
      return { deposits: dep, values: vals, end: v };
    };

    let lo = 0;
    let hi = 1;
    let mid = 0.5;
    let res = run(mid);
    for (let it = 0; it < 60; it++) {
      mid = (lo + hi) / 2;
      res = run(mid);
      if (res.end > targetValue) hi = mid;
      else lo = mid;
    }
    // Absorb the last cent so the line ends exactly on today's value.
    res.values[n - 1] = targetValue;

    // Realised P&L lands in the month the lot actually closed.
    const realizedByMonth: Record<string, number> = {};
    this.positions.forEach((p) => {
      const when = p.soldDate || p.realizedDate;
      if (!p.realizedPnL || !when) return;
      const parts = when.split(' ');
      const k = `${parts[1]} ${parts[2]}`;
      realizedByMonth[k] = (realizedByMonth[k] || 0) + p.realizedPnL;
    });

    let cumDep = 0;
    let bIndex = 1;
    let tIndex = 1;
    let cumRealized = 0;

    this.historyCache = months.map((mo, j) => {
      cumDep += res.deposits[j];
      tIndex *= 1 + r[j];
      bIndex *= 1 + b[j];
      const divNet = this.dividendAt(mo.year, mo.monthIndex);
      const divGross = divNet / (1 - this.constants.withholdingTax);
      const begin = j === 0 ? 0 : res.values[j - 1];
      const realized = realizedByMonth[mo.key] || 0;
      cumRealized += realized;

      const dividendsToDate = sum(
        months.slice(0, j + 1).map((m) => this.dividendAt(m.year, m.monthIndex))
      );

      return {
        key: mo.key,
        label: mo.label,
        short: mo.short,
        year: mo.year,
        monthIndex: mo.monthIndex,
        value: res.values[j],
        invested: cumDep,
        deposits: res.deposits[j],
        withdrawals: 0,
        begin,
        end: res.values[j],
        change: res.values[j] - begin - res.deposits[j],
        monthReturn: r[j] * 100,
        benchmarkReturn: b[j] * 100,
        twrIndex: tIndex,
        benchmarkIndex: bIndex,
        dividends: divNet,
        taxes: divGross - divNet,
        fees: res.deposits[j] > 0 ? Math.round(Math.min(4.95, res.deposits[j] * 0.0009) * 100) / 100 : 0,
        realized,
        realizedToDate: cumRealized,
        capitalGain: res.values[j] - cumDep,
        totalProfit: res.values[j] - cumDep + dividendsToDate + cumRealized
      };
    });

    return this.historyCache;
  }

  /**
   * The same deposit schedule run at the benchmark's monthly returns — the
   * "what if the money had gone into SPY instead" line.
   */
  benchmarkValuePath() {
    let v = 0;
    return this.history().map((m) => {
      v = (v + m.deposits) * (1 + m.benchmarkReturn / 100);
      return { key: m.key, short: m.short, year: m.year, monthIndex: m.monthIndex, value: v };
    });
  }

  historyRange(range?: string): HistoryMonth[] {
    const h = this.history();
    if (range === 'all' || !range) return h;
    if (range === 'YTD') return h.filter((m) => m.year === this.constants.today.year);
    const n = RANGE_MONTHS[range] || h.length;
    return h.slice(Math.max(0, h.length - n));
  }

  /** Monthly percentage returns, for the dynamics bar chart. */
  monthlyReturns(period?: string) {
    let h = this.history();
    if (period && period !== 'all') {
      if (period === '12m') h = h.slice(-12);
      else h = h.filter((m) => String(m.year) === String(period));
    }
    return h.map((m) => ({
      key: m.key,
      label: m.label,
      year: m.year,
      pct: m.monthReturn,
      value: m.value,
      change: m.change
    }));
  }

  /* ---- cash ---------------------------------------------------------------
     There is no stored cash ledger. What exists is the money-market line and
     the dated rows that each moved cash: buys and their fees out, sells and
     dividends in. Deposits and withdrawals are solved for, under one stated
     policy:

       top up   before any row that would take the balance below the float,
                rounded up to $50
       sweep    anything more than $500 above the float back to the bank
                after an inflow, rounded down to $50

     The float is the money-market line itself, so the walk never goes negative
     and ends exactly on today's balance. A closing adjustment absorbs the
     rounding so the last row equals the stored position. -------------------- */

  cashFlow(): CashFlow {
    if (this.cashCache) return this.cashCache;

    const { money, shares } = this.deps;
    const float = this.deps.cashFloat();
    const src = this.deps.ledger().slice().reverse(); // oldest first

    const rows: CashRow[] = [];
    let bal = 0;
    let n = 0;

    const add = (
      type: CashRow['type'],
      date: string,
      signed: number,
      label: string,
      detail: string,
      ticker?: string,
      mono?: string
    ) => {
      bal = Math.round((bal + signed) * 100) / 100;
      rows.push({
        id: `cf${++n}`,
        type,
        date,
        signed,
        amount: Math.abs(signed),
        inflow: signed > 0,
        label,
        detail,
        ticker: ticker ?? null,
        mono: mono ?? null,
        balance: bal
      });
    };

    src.forEach((r) => {
      let effect =
        r.kind === 'income' ? r.amount : r.operation === 'Buy' ? -(r.amount + r.fee) : r.amount - r.fee;
      effect = Math.round(effect * 100) / 100;

      if (effect < 0 && bal + effect < float) {
        const need = Math.ceil((float - (bal + effect)) / 50) * 50;
        add('Deposit', r.date, need, 'Deposit', `Funding the ${r.ticker} purchase`);
      }

      if (r.kind === 'income') {
        add('Dividend', r.date, effect, `${r.ticker} dividend`, r.note || 'Cash distribution', r.ticker, r.mono);
      } else if (r.operation === 'Buy') {
        add('Buy', r.date, effect, `Bought ${r.ticker}`,
          `${shares(r.shares)} sh at ${money(r.price)}${r.fee ? ` · ${money(r.fee)} fee` : ''}`, r.ticker, r.mono);
      } else {
        add('Sell', r.date, effect, `Sold ${r.ticker}`,
          `${shares(r.shares)} sh at ${money(r.price)}${r.fee ? ` · ${money(r.fee)} fee` : ''}`, r.ticker, r.mono);
      }

      if (effect > 0 && bal > float + 500) {
        const sweep = Math.floor((bal - float) / 50) * 50;
        if (sweep > 0) {
          add('Withdrawal', r.date, -sweep, 'Withdrawal', `Swept back to the bank above the ${money(float)} float`);
        }
      }
    });

    const diff = Math.round((float - bal) * 100) / 100;
    if (Math.abs(diff) >= 0.01) {
      add(
        diff > 0 ? 'Deposit' : 'Withdrawal',
        this.constants.today.label,
        diff,
        diff > 0 ? 'Deposit' : 'Withdrawal',
        'Reconciled to the money-market line'
      );
    }

    const by = (t: CashRow['type']) => rows.filter((r) => r.type === t);
    const tot = (t: CashRow['type']) => sum(by(t).map((r) => r.amount));

    // Monthly in/out, over the same span the value charts use.
    const span = this.monthSpan();
    const index: Record<string, CashFlow['months'][number]> = {};
    const months = span.map((mo) => {
      const m = {
        key: mo.key, label: mo.label, short: mo.short, year: mo.year, monthIndex: mo.monthIndex,
        deposits: 0, withdrawals: 0, invested: 0, proceeds: 0, income: 0,
        inflow: 0, outflow: 0, net: 0, end: 0
      };
      index[mo.key] = m;
      return m;
    });

    rows.forEach((r) => {
      const d = parseDate(r.date);
      const m = index[`${MONTHS[d.m]} ${d.y}`];
      if (!m) return;
      if (r.type === 'Deposit') m.deposits += r.amount;
      else if (r.type === 'Withdrawal') m.withdrawals += r.amount;
      else if (r.type === 'Buy') m.invested += r.amount;
      else if (r.type === 'Sell') m.proceeds += r.amount;
      else m.income += r.amount;
      if (r.signed > 0) m.inflow += r.amount;
      else m.outflow += r.amount;
      m.net = m.inflow - m.outflow;
      m.end = r.balance;
    });

    // A month with no rows carries the previous month's closing balance.
    let running = 0;
    months.forEach((m) => {
      if (!m.end) m.end = running;
      running = m.end;
    });

    this.cashCache = {
      currency: this.constants.baseCurrency,
      float,
      balance: bal,
      rows: rows.slice().reverse(),
      deposits: tot('Deposit'),
      withdrawals: tot('Withdrawal'),
      netDeposits: tot('Deposit') - tot('Withdrawal'),
      invested: tot('Buy'),
      proceeds: tot('Sell'),
      income: tot('Dividend'),
      depositCount: by('Deposit').length,
      withdrawalCount: by('Withdrawal').length,
      count: rows.length,
      months,
      first: rows.length ? rows[0].date : null,
      last: rows.length ? rows[rows.length - 1].date : null
    };
    return this.cashCache;
  }
}
