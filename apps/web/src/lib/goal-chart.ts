/**
 * Axis maths for the My goal chart, ported from MyGoal.dc.html.
 *
 * A 25-year compounding path is unreadable on a linear axis, so log is the
 * default — but the linear scale is offered because it is the honest one for
 * judging how much is still to build.
 */

export const GEO = { W: 1000, H: 320, L: 64, R: 22, TOP: 16, BOT: 30 } as const;

/** Decade ticks, falling back to a 1/2/5 series when there are too few. */
export function logTicks(lo: number, hi: number): number[] {
  const decades: number[] = [];
  const fine: number[] = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) {
    [1, 2, 5].forEach((m) => {
      const v = m * Math.pow(10, e);
      if (v < lo || v > hi) return;
      fine.push(v);
      if (m === 1) decades.push(v);
    });
  }
  return fine.length > 6 && decades.length > 2 ? decades : fine;
}

/** A round step near a quarter of the range. */
export function linTicks(lo: number, hi: number): number[] {
  const raw = (hi - lo) / 4;
  const e = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * e).filter((s) => s >= raw)[0] || e * 10;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
  return out;
}

export interface Axis {
  xs: (n: number) => number;
  ys: (v: number) => number;
  ticks: number[];
}

export function buildAxis(
  values: number[],
  span: number,
  logMode: boolean,
  avoid: number
): Axis {
  const { W, H, L, R, TOP, BOT } = GEO;
  const rawHi = Math.max(...values);
  const rawLo = Math.min(...values);
  const hi = logMode ? Math.pow(10, Math.log10(rawHi) + 0.08) : rawHi * 1.08;
  const lo = logMode ? Math.pow(10, Math.log10(Math.max(1, rawLo)) - 0.08) : 0;

  const xs = (n: number) => L + (n / span) * (W - L - R);
  const ys = (v: number) => {
    const t = logMode
      ? (Math.log10(Math.max(1, v)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))
      : (v - lo) / (hi - lo);
    return H - BOT - Math.max(0, Math.min(1, t)) * (H - BOT - TOP);
  };

  // Drop any tick that would collide with the goal line.
  const ticks = (logMode ? logTicks(lo, hi) : linTicks(lo, hi)).filter(
    (v) => Math.abs(ys(v) - ys(avoid)) > 11
  );

  return { xs, ys, ticks };
}
