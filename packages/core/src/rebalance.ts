/** Portfolio rebalancing arithmetic from Rebalancing.dc.html. No orders are placed. */
import type { Engine } from './derive.js';
import type { Category, Position } from './types.js';

export interface RebalanceConfig {
  isCash: boolean;
  newCash: number;
  minTrade: number;
  whole: boolean;
  useSurplus: boolean;
}
  /* Buy-only allocation: water-fill the underweight buckets so the LARGEST
     remaining drift is as small as possible. θ is the pp gap every funded
     bucket is levelled down to; solved by bisection. */
  export function waterFill(cats: Array<Pick<Category, "targetN" | "value">>, cash: number, newValue: number) {
    const need = (theta: number) => cats.map((c) => Math.max(0, (c.targetN - theta) / 100 * newValue - c.value));
    const total = (theta: number) => need(theta).reduce((s, v) => s + v, 0);
    if (cash <= 0) return { amounts: cats.map(() => 0), theta: null, leftover: 0 };
    if (total(0) <= cash) {
      /* every bucket reaches target — park the rest, it is not needed */
      return { amounts: need(0), theta: 0, leftover: cash - total(0) };
    }
    let lo = 0, hi = 100;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (total(mid) > cash) lo = mid; else hi = mid;
    }
    const amounts = need(hi);
    const spent = amounts.reduce((s, v) => s + v, 0);
    return { amounts: amounts, theta: hi, leftover: Math.max(0, cash - spent) };
  }

export function rebalance(engine: Engine, { isCash, newCash, minTrade, whole, useSurplus }: RebalanceConfig) {
    /* ---- the model Categories owns --------------------------------------- */
    const cats = engine.categories(true).map(c => ({ ...c, holdings: engine.open().filter(p => c.tickers.includes(p.ticker)) }));
    const cashNames = engine.cashStats().categoryNames;
    const isCashCat = (n: string) => cashNames.indexOf(n) >= 0;
    const float = engine.cashFloat();
    const cashCat = cats.filter((c) => isCashCat(c.name))[0] || null;
    const surplus = cashCat ? Math.max(0, -cashCat.deltaValue) : 0;   /* cash above its own target */
    const V = engine.totals().value;
    const V2 = V + newCash;

    /* ---- category actions ------------------------------------------------ */
    const tradeable = cats.filter((c) => !isCashCat(c.name));
    const action: Record<string, number> = {};                       /* signed $ per category */
    let sellTotal = 0, buyTotal = 0, surplusUsed = 0, parked = 0;
    let theta: number | null = null;

    if (isCash) {
      const fill = waterFill(cats.map((c) => ({ targetN: c.targetN, value: c.value })), newCash, V2);
      theta = fill.theta;
      cats.forEach((c, i) => {
        const amt = fill.amounts[i];
        if (isCashCat(c.name)) { parked += amt; action[c.name] = 0; return; }
        action[c.name] = amt;
      });
      parked += fill.leftover;
      buyTotal = Object.keys(action).reduce((s, k) => s + action[k], 0);
    } else {
      const need: Record<string, number> = {}, raise: Record<string, number> = {};
      tradeable.forEach((c) => {
        need[c.name] = Math.max(0, c.deltaValue);
        raise[c.name] = Math.max(0, -c.deltaValue);
      });
      sellTotal = tradeable.reduce((s, c) => s + raise[c.name], 0);
      const needTotal = tradeable.reduce((s, c) => s + need[c.name], 0);
      surplusUsed = useSurplus ? Math.min(surplus, Math.max(0, needTotal - sellTotal)) : 0;
      const funding = sellTotal + surplusUsed;
      const k = needTotal > 0 ? Math.min(1, funding / needTotal) : 0;
      buyTotal = 0;
      tradeable.forEach((c) => {
        const v = need[c.name] > 0 ? need[c.name] * k : -raise[c.name];
        action[c.name] = v;
        if (v > 0) buyTotal += v;
      });
      cats.filter((c) => isCashCat(c.name)).forEach((c) => { action[c.name] = -surplusUsed; });
    }

    /* ---- legs: pro-rata by current value inside the bucket --------------- */
    const plannedLegs: Array<{ p: Position; category: string; planned: number }> = [];
    const dropped: Array<{ scope: string; why: string; amount: number; into?: string }> = [];
    tradeable.forEach((c) => {
      const amt = action[c.name] || 0;
      if (Math.abs(amt) < 0.005) return;
      if (Math.abs(amt) < minTrade) {
        dropped.push({ scope: c.name, why: 'whole bucket', amount: amt });
        action[c.name] = 0;
        return;
      }
      if (!c.holdings.length) {
        dropped.push({ scope: c.name, why: 'empty bucket', amount: amt });
        action[c.name] = 0;
        return;
      }
      const raw = c.holdings.map((p) => ({ p: p, amt: c.value ? amt * p.value / c.value : 0 }));
      const keep = raw.filter((r) => Math.abs(r.amt) >= minTrade);
      const small = raw.filter((r) => Math.abs(r.amt) < minTrade);
      let list = keep;
      if (keep.length === 0) {
        /* nothing clears the minimum on its own — put it all on the largest line */
        const big = raw.slice().sort((a, b) => b.p.value - a.p.value)[0];
        list = [{ p: big.p, amt: amt }];
        small.forEach((r) => { if (r.p.ticker !== big.p.ticker) dropped.push({ scope: r.p.ticker, why: 'rolled', into: big.p.ticker, amount: r.amt }); });
      } else if (small.length) {
        const big = keep.slice().sort((a, b) => Math.abs(b.amt) - Math.abs(a.amt))[0];
        const roll = small.reduce((s, r) => s + r.amt, 0);
        list = keep.map((r) => (r.p.ticker === big.p.ticker ? { p: r.p, amt: r.amt + roll } : r));
        small.forEach((r) => dropped.push({ scope: r.p.ticker, why: 'rolled', into: big.p.ticker, amount: r.amt }));
      }
      list.forEach((r) => plannedLegs.push({ p: r.p, category: c.name, planned: r.amt }));
    });

    /* execution: whole shares floor the leg and leave a residual */
    let residual = 0;
    const legs = plannedLegs.map((l) => {
      const price = l.p.price || 1;
      const rawShares = Math.abs(l.planned) / price;
      let shares = rawShares, exec = Math.abs(l.planned);
      if (whole) { shares = Math.floor(rawShares); exec = shares * price; }
      const sign = l.planned >= 0 ? 1 : -1;
      residual += Math.abs(l.planned) - exec;
      return Object.assign({}, l, {
        price: price, shares: shares, rawShares: rawShares, sign: sign,
        exec: sign * exec, blocked: whole && shares < 1, fractional: !whole && rawShares < 1
      });
    });

    const execBuys = legs.filter((l) => l.sign > 0).reduce((s, l) => s + Math.abs(l.exec), 0);
    const execSells = legs.filter((l) => l.sign < 0).reduce((s, l) => s + Math.abs(l.exec), 0);

    /* ---- after-state, straight from the executed legs -------------------- */
    const after: Record<string, number> = {};
    cats.forEach((c) => { after[c.name] = c.value; });
    legs.forEach((l) => { after[l.category] += l.exec; });
    const cashName = cashCat ? cashCat.name : null;
    if (cashName) {
      /* the buys already exceed the sells by exactly surplusUsed — the surplus
         must not be subtracted a second time, or value stops being conserved */
      after[cashName] = float + (isCash ? newCash : 0) + execSells - execBuys;
    }
    const afterTotal = cats.reduce((s, c) => s + after[c.name], 0);
    const afterWeight = (name: string) => afterTotal ? after[name] / afterTotal * 100 : 0;
    const afterDrift = (c: Category) => afterWeight(c.name) - c.targetN;

    const driftBefore = cats.reduce((s, c) => s + Math.abs(c.driftN), 0);
    const driftAfter = cats.reduce((s, c) => s + Math.abs(afterDrift(c)), 0);
    const closedPct = driftBefore > 0 ? Math.max(0, (driftBefore - driftAfter) / driftBefore * 100) : 0;
    const worstBefore = cats.slice().sort((a, b) => Math.abs(b.driftN) - Math.abs(a.driftN))[0];
    const worstAfter = cats.slice().sort((a, b) => Math.abs(afterDrift(b)) - Math.abs(afterDrift(a)))[0];


    return { cats, isCashCat, float, cashCat, surplus, V, V2, action, buyTotal, surplusUsed, parked, theta, legs, dropped, residual, execBuys, execSells, after, afterTotal, afterWeight, afterDrift, driftBefore, driftAfter, closedPct, worstBefore, worstAfter, cashName };
}
