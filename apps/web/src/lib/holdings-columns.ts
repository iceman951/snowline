/**
 * Column definitions for the holdings table, ported from HoldingsTable.dc.html.
 *
 * Each column knows its label, width, tooltip, how to sort by it, how to render
 * a cell, and how to render the total row. Views are named sets of these, so a
 * view change is a column-set change and nothing else.
 */

import { fmt, type Constants, type Holding, type Totals } from '@snowline/core';

export type Tone = 'plain' | 'pos' | 'neg';
export type Align = 'left' | 'right';

export interface Cell {
  primary: string;
  secondary: string;
  tone: Tone;
  align: Align;
}

export interface ColumnDef {
  label: string;
  w: number;
  tip?: string;
  align?: Align;
  sort: (h: Holding) => number | string;
  cell: (h: Holding) => Cell;
  total: (t: Totals, k: Constants, holdings: Holding[]) => Cell;
}

export type ViewName = 'My holdings' | 'General' | 'Dividends' | 'Returns';

export const VIEWS: Record<ViewName, string[]> = {
  'My holdings': ['shares', 'cost', 'value', 'divs', 'yield', 'growth5y', 'profit', 'irr', 'share'],
  General: ['shares', 'price', 'cost', 'value', 'profit', 'share', 'sector', 'class', 'currency'],
  Dividends: ['shares', 'annual', 'pershare', 'yield', 'yoc', 'payout', 'growth5y', 'freq', 'nextex'],
  Returns: ['cost', 'value', 'divrecv', 'capgain', 'realized', 'profit', 'daily', 'irr']
};

/** Sorting a text column starts ascending; a numeric one starts descending. */
export const TEXT_KEYS = ['holding', 'sector', 'class', 'currency', 'freq'];

const two = (primary: string, secondary = '', tone: Tone = 'plain', align: Align = 'right'): Cell => ({
  primary,
  secondary,
  tone,
  align
});

const left = (primary: string, secondary = '', tone: Tone = 'plain') => two(primary, secondary, tone, 'left');

/**
 * `currencyFor` decides the prefix per position: in USD mode everything is '$',
 * in local mode a non-USD holding shows its own code.
 */
export function columnDefs(currencyFor: (h?: Holding) => string): Record<string, ColumnDef> {
  const money = (n: number, h?: Holding) => fmt.money(n, currencyFor(h));
  const signed = (n: number, h?: Holding) => fmt.signed(n, currencyFor(h));

  return {
    shares: {
      label: 'Shares',
      w: 92,
      tip: 'Fractional positions are shown to six decimals.',
      sort: (h) => h.p.shares,
      cell: (h) => two(fmt.shares(h.p.shares), h.p.price ? `${money(h.p.price, h)}/sh` : '—'),
      total: (t) => two(fmt.shares(t.shares), `${t.holdings} positions`)
    },
    price: {
      label: 'Price',
      w: 110,
      sort: (h) => h.p.price,
      cell: (h) =>
        two(
          h.p.price ? money(h.p.price, h) : '—',
          h.p.dayChangePct ? fmt.caret(h.p.dayChangePct) : 'flat',
          fmt.tone(h.p.dayChangePct)
        ),
      total: () => two('—')
    },
    cost: {
      label: 'Cost basis',
      w: 116,
      sort: (h) => h.p.costTotal,
      cell: (h) => two(money(h.p.costTotal, h), h.p.costPerShare ? `${money(h.p.costPerShare, h)}/sh` : '—'),
      total: (t) => two(fmt.money(t.invested), 'invested')
    },
    value: {
      label: 'Current value',
      w: 124,
      sort: (h) => h.p.value,
      cell: (h) => two(money(h.p.value, h), h.p.price ? `${money(h.p.price, h)}/sh` : 'closed'),
      total: (t) => two(fmt.money(t.value), 'market value')
    },
    divs: {
      label: 'Dividends',
      w: 110,
      tip: 'Total dividends received after tax.',
      sort: (h) => h.p.dividendsReceived,
      cell: (h) =>
        two(
          money(h.p.dividendsReceived, h),
          h.dividendsPerShare ? `${money(h.dividendsPerShare, h)}/sh` : '—'
        ),
      total: (t) => two(fmt.money(t.dividendsReceived), 'after tax')
    },
    divrecv: {
      label: 'Div. received',
      w: 118,
      tip: 'Total dividends received after tax.',
      sort: (h) => h.p.dividendsReceived,
      cell: (h) =>
        two(
          money(h.p.dividendsReceived, h),
          h.dividendsPerShare ? `${money(h.dividendsPerShare, h)}/sh` : '—'
        ),
      total: (t) => two(fmt.money(t.dividendsReceived), 'after tax')
    },
    yield: {
      label: 'Dividend yield',
      w: 116,
      tip: 'Forward yield on today’s price, before withholding tax.',
      sort: (h) => h.p.yieldPct,
      cell: (h) =>
        two(h.p.yieldPct ? fmt.pct(h.p.yieldPct) : '—', h.yieldOnCost ? `${fmt.pct(h.yieldOnCost)} on cost` : ''),
      total: (t) => two(fmt.pct(t.grossYield), `${fmt.pct(t.yieldOnCost)} on cost`)
    },
    yoc: {
      label: 'Yield on cost',
      w: 116,
      tip: 'Forward income divided by what you paid for the position.',
      sort: (h) => h.yieldOnCost,
      cell: (h) =>
        two(h.yieldOnCost ? fmt.pct(h.yieldOnCost) : '—', h.p.yieldPct ? `${fmt.pct(h.p.yieldPct)} current` : ''),
      total: (t) => two(fmt.pct(t.yieldOnCost), `${fmt.pct(t.grossYield)} current`)
    },
    growth5y: {
      label: 'Dividend growth (5Y)',
      w: 132,
      tip: 'Compound annual growth of the dividend over five years. Blank where the holding has less than five years of payments.',
      sort: (h) => (h.p.dividendGrowth5Y === null ? -999 : h.p.dividendGrowth5Y),
      cell: (h) =>
        h.p.dividendGrowth5Y === null
          ? two('—', 'no 5Y history')
          : two(fmt.caret(h.p.dividendGrowth5Y, 1), '5Y CAGR', fmt.tone(h.p.dividendGrowth5Y)),
      total: () => two('—', 'mixed history')
    },
    payout: {
      label: 'Payout ratio',
      w: 116,
      tip: 'Dividend as a share of earnings. Not meaningful for option-income funds.',
      sort: (h) => (h.p.payoutRatio === null ? -1 : h.p.payoutRatio),
      cell: (h) =>
        h.p.payoutRatio === null ? two('—', 'option income') : two(fmt.pct(h.p.payoutRatio, 1), 'of earnings'),
      total: () => two('—')
    },
    annual: {
      label: 'Annual dividend',
      w: 130,
      tip: 'Forward 12-month gross income at today’s yield.',
      sort: (h) => h.annualGross,
      cell: (h) => (h.annualGross ? two(money(h.annualGross, h), `${money(h.annualNet, h)} net`) : two('—')),
      total: (t) => two(fmt.money(t.forwardGross), `${fmt.money(t.forwardNet)} net`)
    },
    pershare: {
      label: 'Per share',
      w: 108,
      sort: (h) => h.perShareGross,
      cell: (h) =>
        h.perShareGross ? two(money(h.perShareGross, h), h.p.frequency.toLowerCase()) : two('—'),
      total: () => two('—')
    },
    freq: {
      label: 'Payment frequency',
      w: 138,
      align: 'left',
      sort: (h) => h.p.frequency,
      cell: (h) =>
        left(
          h.p.yieldPct ? h.p.frequency : '—',
          h.p.yieldPct ? (h.p.frequency === 'Monthly' ? '12 × a year' : '4 × a year') : 'no dividend'
        ),
      total: () => left('—')
    },
    nextex: {
      label: 'Next ex-date',
      w: 122,
      tip: 'Own the shares before this date to receive the next payment.',
      sort: (h) => h.p.nextExDate || '',
      cell: (h) => two(h.p.nextExDate || '—', h.p.nextPayDate ? `pays ${h.p.nextPayDate}` : ''),
      total: () => two('—')
    },
    profit: {
      label: 'Total profit',
      w: 124,
      tip: 'Capital gain plus dividends received and realised P&L, net of fees.',
      sort: (h) => h.totalProfit,
      cell: (h) =>
        two(
          signed(h.totalProfit, h),
          h.p.costTotal ? fmt.caret(h.totalProfitPct) : 'realised',
          fmt.tone(h.totalProfit)
        ),
      total: (t) => two(fmt.signed(t.totalProfit), fmt.caret(t.totalProfitPct), fmt.tone(t.totalProfit))
    },
    capgain: {
      label: 'Capital gain',
      w: 124,
      sort: (h) => h.capitalGain,
      cell: (h) =>
        h.p.costTotal
          ? two(signed(h.capitalGain, h), fmt.caret(h.capitalGainPct), fmt.tone(h.capitalGain))
          : two('—', 'position closed'),
      total: (t) => two(fmt.signed(t.capitalGain), fmt.caret(t.capitalGainPct), fmt.tone(t.capitalGain))
    },
    realized: {
      label: 'Realized P&L',
      w: 118,
      tip: 'Profit locked in on shares you have already sold.',
      sort: (h) => h.p.realizedPnL,
      cell: (h) =>
        h.p.realizedPnL
          ? two(signed(h.p.realizedPnL, h), 'closed lots', fmt.tone(h.p.realizedPnL))
          : two('—'),
      total: (t) => two(fmt.signed(t.realizedPnL), 'closed lots', fmt.tone(t.realizedPnL))
    },
    daily: {
      label: 'Daily',
      w: 116,
      sort: (h) => h.p.dayChangeAbs,
      cell: (h) =>
        h.p.dayChangeAbs
          ? two(signed(h.p.dayChangeAbs, h), fmt.caret(h.p.dayChangePct), fmt.tone(h.p.dayChangeAbs))
          : two('—', 'flat'),
      total: (t) => two(fmt.signed(t.dayChange), fmt.caret(t.dayChangePct), fmt.tone(t.dayChange))
    },
    irr: {
      label: 'IRR',
      w: 92,
      tip: 'Money-weighted annualised return, including dividends.',
      sort: (h) => h.p.irr,
      cell: (h) => two(fmt.caret(h.p.irr), 'annualised', fmt.tone(h.p.irr)),
      // The table's own money-weighted return across open holdings — a stored
      // constant in the data model, not a sum of the column above it.
      total: (_t, k) => two(fmt.caret(k.irrHoldingsTable), 'open holdings', 'pos')
    },
    share: {
      label: 'Share in portfolio',
      w: 128,
      sort: (h) => h.shareOfPortfolio,
      cell: (h) =>
        h.shareOfPortfolio
          ? two(fmt.pct(h.shareOfPortfolio), `${fmt.pct(h.shareOfCategory, 1)} of ${h.categoryName}`)
          : two('—', 'sold'),
      total: (t) => two('100.0%', `${t.categoryCount} categories`)
    },
    sector: {
      label: 'Sector',
      w: 158,
      align: 'left',
      sort: (h) => h.p.sector,
      cell: (h) => left(h.p.sector, `${fmt.pct(h.shareOfPortfolio, 1)} of portfolio`),
      total: (t) => left(`${t.categoryCount} categories`)
    },
    class: {
      label: 'Class',
      w: 96,
      align: 'left',
      sort: (h) => h.p.assetClass,
      cell: (h) => left(h.p.assetClass),
      total: (_t, _k, holdings) => {
        const seen = new Set(holdings.filter((h) => h.p.status === 'open').map((h) => h.p.assetClass));
        return left(`${seen.size} classes`);
      }
    },
    currency: {
      label: 'Currency',
      w: 104,
      align: 'left',
      sort: (h) => h.p.currency,
      cell: (h) => left(h.p.currency, `FX ${h.p.fxToUsd.toFixed(4)}`),
      total: (_t, k) => left(k.baseCurrency, 'base')
    }
  };
}

export function toneColor(t: Tone): string {
  return t === 'pos' ? 'var(--accent)' : t === 'neg' ? 'var(--neg)' : 'var(--t1)';
}

export function subToneColor(t: Tone): string {
  return t === 'pos' ? 'var(--accent)' : t === 'neg' ? 'var(--neg)' : 'var(--t2)';
}
