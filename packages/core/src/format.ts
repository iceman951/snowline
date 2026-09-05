/**
 * Shared formatters — every screen formats identically.
 * Ported verbatim from the prototype's `fmt` so rounding never drifts
 * between two places that show the same number.
 */

export const fmt = {
  num(n: number, d = 2): string {
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  },
  shares(n: number): string {
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 });
  },
  money(n: number, cur = '$'): string {
    return (n < 0 ? '-' : '') + cur + fmt.num(Math.abs(n));
  },
  signed(n: number, cur = '$'): string {
    return (n < 0 ? '-' : '+') + cur + fmt.num(Math.abs(n));
  },
  pct(n: number, d = 2): string {
    return fmt.num(n, d) + '%';
  },
  caret(n: number, d = 2): string {
    return (n >= 0 ? '▲' : '▼') + fmt.num(Math.abs(n), d) + '%';
  },
  k(n: number): string {
    return '$' + fmt.num(n / 1000) + 'k';
  },
  /** Compact money for chart axes: $1.2M / $685k / $412 */
  compact(n: number): string {
    if (n >= 1e6) return '$' + fmt.num(n / 1e6, (n / 1e6) % 1 === 0 ? 0 : 1) + 'M';
    if (n >= 1000) return '$' + fmt.num(n / 1000, 0) + 'k';
    return '$' + fmt.num(n, 0);
  },
  tone(n: number): 'pos' | 'neg' | 'plain' {
    return n > 0 ? 'pos' : n < 0 ? 'neg' : 'plain';
  }
};

export const MONTH_FULL: Record<string, string> = {
  Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
  May: 'May', Jun: 'June', Jul: 'July', Aug: 'August',
  Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December'
};
