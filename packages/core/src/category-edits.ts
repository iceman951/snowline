/** Category mutations ported from snowline-data.js. Persistence is the caller's job. */
import { Engine } from './derive.js';
import type { CategoryModel } from './types.js';

export type CategoryEdit =
  | { kind: 'create'; name: string; target: number }
  | { kind: 'rename'; name: string; to: string }
  | { kind: 'target'; name: string; target: number }
  | { kind: 'assign'; ticker: string; name: string }
  | { kind: 'delete'; name: string; moveTo: string }
  | { kind: 'move'; name: string; delta: number }
  | { kind: 'normalise' }
  | { kind: 'reset' };

export function editCategories(engine: Engine, edit: CategoryEdit): CategoryModel {
  const m = engine.categoryModel();
  switch (edit.kind) {
    case 'reset': return engine.categorySeed();
    case 'assign':
      if (!m.order.includes(edit.name) || !engine.byTicker(edit.ticker)) return m;
      m.assign[edit.ticker] = edit.name;
      break;
    case 'target': {
      if (!m.order.includes(edit.name)) return m;
      const v = Number(edit.target);
      m.targets[edit.name] = isFinite(v) ? Math.max(0, Math.min(100, Math.round(v * 100) / 100)) : 0;
      break;
    }
    case 'create': {
      const clean = String(edit.name || '').trim();
      if (!clean || m.order.includes(clean)) return m;
      m.order.push(clean);
      m.targets[clean] = Math.max(0, Number(edit.target) || 0);
      break;
    }
    case 'rename': {
      const clean = String(edit.to || '').trim();
      if (!clean || !m.order.includes(edit.name) || (clean !== edit.name && m.order.includes(clean))) return m;
      m.order = m.order.map((n) => n === edit.name ? clean : n);
      m.targets[clean] = m.targets[edit.name];
      if (clean !== edit.name) delete m.targets[edit.name];
      for (const ticker of Object.keys(m.assign)) if (m.assign[ticker] === edit.name) m.assign[ticker] = clean;
      break;
    }
    case 'delete': {
      if (!m.order.includes(edit.name) || m.order.length < 2) return m;
      // A deleted bucket passes its target and holdings to the destination.
      const dest = m.order.includes(edit.moveTo) && edit.moveTo !== edit.name
        ? edit.moveTo : m.order.find((n) => n !== edit.name)!;
      for (const ticker of Object.keys(m.assign)) if (m.assign[ticker] === edit.name) m.assign[ticker] = dest;
      m.targets[dest] = Math.round((m.targets[dest] + m.targets[edit.name]) * 100) / 100;
      delete m.targets[edit.name];
      m.order = m.order.filter((n) => n !== edit.name);
      break;
    }
    case 'move': {
      const i = m.order.indexOf(edit.name), j = i + edit.delta;
      if (i < 0 || j < 0 || j >= m.order.length) return m;
      m.order.splice(j, 0, m.order.splice(i, 1)[0]);
      break;
    }
    case 'normalise': {
      const total = engine.targetTotal();
      if (!total) return m;
      let acc = 0;
      m.order.forEach((n, i) => {
        if (i === m.order.length - 1) { m.targets[n] = Math.round((100 - acc) * 100) / 100; return; }
        const v = Math.round(m.targets[n] / total * 10000) / 100;
        m.targets[n] = v;
        acc = Math.round((acc + v) * 100) / 100;
      });
      break;
    }
  }
  // Match the prototype's saveCategoryModel -> categoryModel normalization.
  return new Engine({
    positions: engine.positions, constants: engine.constants,
    dividendHistory: engine.dividendHistory, categoryTargets: engine.categoryTargets,
    categoryModel: m
  }).categoryModel();
}
