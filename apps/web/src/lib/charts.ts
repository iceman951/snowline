/**
 * SVG geometry helpers, ported from the prototype's chart maths so bars,
 * gridlines and donut arcs land on the same pixels as the design.
 *
 * All charts use a 624-wide viewBox with the plot area from x=34 to x=616.
 */

import { fmt } from '@snowline/core';

export const PLOT = { left: 34, right: 616, top: 12, base: 148, vbW: 624, vbH: 154 } as const;

export interface Bar {
  i: number;
  /** hover strip */
  sx: string;
  sw: string;
  /** bar centre */
  cx: string;
  /** bar rect */
  x: string;
  w: number;
  y: string;
  h: string;
  raw: number;
}

export function bars(
  vals: number[],
  count: number,
  max: number,
  barWidth: number,
  { left, right, top, base } = PLOT
): Bar[] {
  const slot = (right - left) / count;
  const out: Bar[] = [];
  for (let i = 0; i < count; i++) {
    const v = vals[i] ?? 0;
    const h = Math.max(0, (v / max) * (base - top));
    const sx = left + i * slot;
    out.push({
      i,
      sx: sx.toFixed(1),
      sw: slot.toFixed(1),
      cx: (sx + slot / 2).toFixed(1),
      x: (sx + (slot - barWidth) / 2).toFixed(1),
      w: barWidth,
      y: (base - h).toFixed(1),
      h: h.toFixed(1),
      raw: v
    });
  }
  return out;
}

export interface GridLine {
  y: string;
  top: string;
  label: string;
}

export function gridFor(max: number, steps: number, vbH = PLOT.vbH): GridLine[] {
  const { base, top } = PLOT;
  const out: GridLine[] = [];
  for (let i = 0; i <= steps; i++) {
    const v = (max / steps) * i;
    const y = base - (base - top) * (i / steps);
    out.push({
      y: y.toFixed(1),
      top: ((y / vbH) * 100).toFixed(2) + '%',
      label: '$' + fmt.num(v, 0)
    });
  }
  return out;
}

/** An SVG arc path, used for the donut's dashed target ring. */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const pt = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  const [x0, y0] = pt(a0);
  const [x1, y1] = pt(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/**
 * The accent ramp the prototype uses to colour category series: full accent
 * down to grey, evenly spaced.
 */
export function ramp(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = n === 1 ? 100 : Math.round(100 - i * (94 / (n - 1)));
    out.push(`color-mix(in oklab, var(--accent) ${p}%, var(--grey-series))`);
  }
  return out;
}

/** Clamp a tooltip's centre so it never hangs off either edge of the chart. */
export function tipLeft(cx: string | number): string {
  return Math.min(86, Math.max(16, (parseFloat(String(cx)) / PLOT.vbW) * 100)) + '%';
}

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
  tone?: 'pos' | 'neg';
}

export interface TooltipData {
  title: string;
  headline: string;
  sub?: string;
  rows?: TooltipRow[];
  footer?: string;
  footerTone?: 'pos' | 'neg';
}
