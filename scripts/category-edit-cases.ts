import type { CategoryEdit } from '../packages/core/src/category-edits.js';

/** Shared inputs only; expected results are executed by the design bundle. */
export const categoryEditCases: Array<{ name: string; edits: CategoryEdit[] }> = [
  { name: 'create, assign, rename, reorder, target, normalize, delete and reset', edits: [
    { kind: 'create', name: '  Income  ', target: 5.126 },
    { kind: 'assign', ticker: 'GLDI', name: 'Income' },
    { kind: 'rename', name: 'Income', to: 'Monthly income' },
    { kind: 'move', name: 'Monthly income', delta: -1 },
    { kind: 'target', name: 'Monthly income', target: 17.126 },
    { kind: 'normalise' },
    { kind: 'delete', name: 'Monthly income', moveTo: 'Funds' },
    { kind: 'reset' }
  ] },
  { name: 'invalid references, duplicate names, clamps and fallback destination', edits: [
    { kind: 'create', name: '', target: 5 },
    { kind: 'create', name: 'Funds', target: 1 },
    { kind: 'rename', name: 'Cash', to: 'Funds' },
    { kind: 'rename', name: 'Cash', to: 'Cash' },
    { kind: 'assign', ticker: 'MISSING', name: 'Cash' },
    { kind: 'assign', ticker: 'GLDI', name: 'Missing' },
    { kind: 'assign', ticker: 'TSM', name: 'Cash' },
    { kind: 'move', name: 'Funds', delta: -1 },
    { kind: 'target', name: 'Funds', target: 150 },
    { kind: 'target', name: 'Funds', target: -1 },
    { kind: 'delete', name: 'Cash', moveTo: 'Missing' }
  ] },
  { name: 'zero target plan and final bucket cannot be removed', edits: [
    ...['Cash', 'Financials', 'Communication Services', 'Consumer Staples', 'Information Technology', 'Consumer Discretionary'].map((name): CategoryEdit => ({ kind: 'delete', name, moveTo: 'Funds' })),
    { kind: 'delete', name: 'Funds', moveTo: 'Funds' },
    { kind: 'target', name: 'Funds', target: 0 },
    { kind: 'normalise' }
  ] }
];
