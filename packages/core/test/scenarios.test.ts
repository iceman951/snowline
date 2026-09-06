/**
 * Stateful parity cases for the already-ported engine. Run the read-only design
 * bundle as an independent oracle so new screens can trust more than its seed
 * totals. Each case gets its own browser storage and dataset; no real database
 * or generated reference file is touched.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'bun:test';
import { Engine, MONTHS, fmt } from '../src/index.js';
import type { CategoryModel, Dataset, GoalConfig } from '../src/types.js';

const source = readFileSync(new URL('../../../snowline/project/snowline-data.js', import.meta.url), 'utf8');

type Prototype = Dataset & Pick<Engine,
  'totals' | 'holdings' | 'categories' | 'categoryModel' | 'categorySeed' |
  'categoryOf' | 'targetTotal' | 'scheduleFor' | 'forwardPayments' |
  'goalConfig' | 'projection'
> & { fmt: Omit<typeof fmt, 'compact'> };

function fixture(categoryModel?: CategoryModel) {
  const storage = new Map<string, string>();
  if (categoryModel) storage.set('snowline.categories.v1', JSON.stringify(categoryModel));
  const browser = {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); }
    },
    SnowlineData: undefined as Prototype | undefined
  };
  // Pass a local window, never replace globalThis.window used by other tests.
  new Function('window', source)(browser);
  const prototype = browser.SnowlineData!;
  const engine = new Engine(structuredClone({
    positions: prototype.positions,
    constants: prototype.constants,
    dividendHistory: prototype.dividendHistory,
    categoryTargets: prototype.categoryTargets,
    categoryModel
  }));
  return { engine, prototype };
}

/** The port omits prototype-only display fields, but every ported field must match. */
function parity(actual: unknown, expected: unknown, path = 'result'): void {
  if (typeof actual === 'number' && typeof expected === 'number') {
    expect(Number.isFinite(actual), path + ' is finite').toBe(true);
    expect(Math.abs(actual - expected), path).toBeLessThan(1e-7);
  } else if (Array.isArray(actual)) {
    expect(Array.isArray(expected), path).toBe(true);
    expect(actual.length, path + '.length').toBe((expected as unknown[]).length);
    actual.forEach((value, i) => parity(value, (expected as unknown[])[i], `${path}[${i}]`));
  } else if (actual !== null && typeof actual === 'object') {
    expect(expected !== null && typeof expected === 'object', path).toBe(true);
    for (const [key, value] of Object.entries(actual)) {
      expect(Object.hasOwn(expected as object, key), `${path}.${key} exists in prototype`).toBe(true);
      parity(value, (expected as Record<string, unknown>)[key], `${path}.${key}`);
    }
  } else {
    expect(actual, path).toEqual(expected);
  }
}

describe('holdings screen parity', () => {
  for (const includeSold of [false, true]) {
    it(`matches every position and derived field (includeSold=${includeSold})`, () => {
      const { engine, prototype } = fixture();
      parity(engine.holdings(includeSold), prototype.holdings(includeSold));
    });
  }
});

describe('category edits propagate to every consumer', () => {
  const cases: Array<[string, CategoryModel]> = [
    ['regrouped holdings and an empty bucket', {
      order: ['Income', 'Reserve', 'Unallocated'],
      targets: { Income: 75, Reserve: 20, Unallocated: 5 },
      assign: { GLDI: 'Income', JEPQ: 'Income', BIL: 'Reserve', DIMEFCD: 'Reserve' }
    }],
    ['removed categories and stale ticker assignments', {
      order: ['Cash', 'Funds'], targets: { Cash: 10, Funds: 90 },
      assign: { GLDI: 'Deleted bucket', BIL: 'Funds', TSM: 'Cash' }
    }],
    ['duplicate names, blank names and rounded targets', {
      order: ['Funds', '', 'Cash', 'Funds'],
      targets: { Funds: 97.126, Cash: -10 }, assign: {}
    }],
    ['an empty saved plan falls back to the seed', { order: [], targets: {}, assign: {} }]
  ];
  for (const [name, model] of cases) {
    it(name, () => {
      const { engine, prototype } = fixture(model);
      const before = structuredClone(model);
      parity(engine.categorySeed(), prototype.categorySeed());
      parity(engine.categoryModel(), prototype.categoryModel());
      parity(engine.targetTotal(), prototype.targetTotal());
      parity(engine.categories(), prototype.categories());
      parity(engine.categories(true), prototype.categories(true));
      parity(engine.holdings(true), prototype.holdings(true));
      parity(engine.totals(), prototype.totals());
      for (const p of engine.positions) parity(engine.categoryOf(p.ticker), prototype.categoryOf(p.ticker));
      expect(model).toEqual(before);
    });
  }
});

describe('dividend payment detail parity', () => {
  it('matches ticker order and amounts in all twelve calendar months', () => {
    const { engine, prototype } = fixture();
    for (const month of MONTHS) parity(engine.scheduleFor(month), prototype.scheduleFor(month), month);
  });

  for (const monthIndex of [0, 7, 11]) {
    it(`matches every payment status and year rollover starting in month ${monthIndex + 1}`, () => {
      const { engine, prototype } = fixture();
      engine.constants.today.monthIndex = monthIndex;
      prototype.constants.today.monthIndex = monthIndex;
      parity(engine.forwardPayments(), prototype.forwardPayments());
    });
  }
});

describe('goal configuration and complete projection parity', () => {
  const cases: Array<[string, Partial<GoalConfig>]> = [
    ['defaults', {}],
    ['income goal with growing contributions', {
      mode: 'income', incomeTarget: 12000, monthlyContribution: 750, contributionGrowth: 0.04
    }],
    ['dividends withdrawn instead of reinvested', { reinvestDividends: false }],
    ['no new contributions and no dividend growth', { monthlyContribution: 0, dividendGrowth: 0 }],
    ['zero tax and inflation', { taxDrag: 0, inflation: 0 }],
    ['falling portfolio and dividend income', {
      expectedReturn: -0.1, safeReturn: -0.05, dividendGrowth: -0.02, byYear: 2030
    }],
    ['target beyond the selected horizon', { valueTarget: 1e9, byYear: 2027 }],
    ['lower input clamps', {
      byYear: 2020, valueTarget: -10, incomeTarget: 0, monthlyContribution: -1, taxDrag: -0.2
    }],
    ['upper input clamps', { byYear: 2200, taxDrag: 2 }]
  ];
  for (const [name, patch] of cases) {
    it(name, () => {
      const { engine, prototype } = fixture();
      parity(engine.goalConfig(patch), prototype.goalConfig(patch));
      parity(engine.projection(patch), prototype.projection(patch));
    });
  }
});

describe('shared display format parity', () => {
  it('matches rounding, signs and fractional shares', () => {
    const { prototype } = fixture();
    for (const value of [-1234.56789, -0.005, -0, 0, 0.000001, 1.005, 999.99, 1000, 1000000, 1250000]) {
      // compact() belongs to screen chart helpers, not SnowlineData.fmt.
      for (const key of ['num', 'shares', 'money', 'signed', 'pct', 'caret', 'k', 'tone'] as const) {
        expect(fmt[key](value), `${key}(${value})`).toBe(prototype.fmt[key](value));
      }
      expect(fmt.money(value, 'THB ')).toBe(prototype.fmt.money(value, 'THB '));
      expect(fmt.signed(value, 'THB ')).toBe(prototype.fmt.signed(value, 'THB '));
    }
  });
});
