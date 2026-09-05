/** Route map and icon paths for the shell, mirroring the prototype's TopNav. */

export const ICONS = {
  bars: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  pie: 'M12 3a9 9 0 1 0 9 9h-9V3Z',
  coins: 'M4 8h13l-3-3M20 16H7l3 3',
  trend: 'M3 17l6-6 4 4 8-8M21 7v6h-6',
  gauge: 'M4 18a8 8 0 1 1 16 0M12 18l4-6',
  doc: 'M6 3h8l5 5v13H6V3Zm8 0v5h5',
  table: 'M3 5h18v14H3V5Zm0 5h18M9 10v9',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  cal: 'M4 6h16v14H4V6Zm3-3v3m10-3v3M4 11h16',
  target: 'M12 3v18M3 12h18M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
  wallet: 'M3 7h15a3 3 0 0 1 3 3v7H3V7Zm0 0V5h12',
  tag: 'M4 11l7-7 9 9-7 7-9-9Zm4-1h.01',
  split: 'M4 6h6l10 12h-4M20 6h-4L6 18H4',
  scale: 'M12 4v16M6 8l-3 6h6l-3-6Zm12 0l-3 6h6l-3-6ZM5 8h14',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5.5 12.5L21 21',
  dip: 'M3 6l5 8 4-3 3 5 6-10',
  lab: 'M9 3h6v5l5 13H4L9 8V3Zm-2 12h10',
  home: 'M4 11l8-7 8 7v9H4v-9Zm5 9v-6h6v6',
  plus: 'M12 5v14M5 12h14',
  upload: 'M12 20V6M6 12l6-6 6 6M4 20h16',
  pct: 'M6 6h.01M18 18h.01M19 5L5 19'
} as const;

export interface NavRow {
  label?: string;
  d?: string;
  href?: string;
  sep?: true;
  group?: string;
}

export const ANALYTICS_ROWS: NavRow[] = [
  { label: 'Common', d: ICONS.bars, href: '/analytics' },
  { label: 'Diversification', d: ICONS.pie, href: '/analytics/diversification' },
  { label: 'Dividends', d: ICONS.coins, href: '/analytics/dividends' },
  { label: 'Growth', d: ICONS.trend, href: '/analytics/growth' },
  { sep: true },
  { label: 'Metrics', d: ICONS.gauge, href: '/analytics/metrics' },
  { label: 'Report', d: ICONS.doc, href: '/analytics/report' }
];

export const PORTFOLIO_ROWS: NavRow[] = [
  { label: 'Holdings', d: ICONS.table, href: '/portfolio/holdings' },
  { label: 'Transactions', d: ICONS.list, href: '/portfolio/transactions' },
  { label: 'Dividend calendar', d: ICONS.cal, href: '/portfolio/dividend-calendar' },
  { label: 'My goal', d: ICONS.target, href: '/portfolio/goal' },
  { sep: true },
  { label: 'Cash', d: ICONS.wallet, href: '/portfolio/cash' },
  { label: 'Categories', d: ICONS.tag, href: '/portfolio/categories' },
  { label: 'Corporate actions', d: ICONS.split, href: '/portfolio/corporate-actions' }
];

export const TOOLS_ROWS: NavRow[] = [
  { label: 'Portfolio rebalancing', d: ICONS.scale, href: '/tools/rebalancing' },
  { label: 'Top dividend stocks', d: ICONS.search, href: '/tools/screener' },
  { label: 'Find the Dip', d: ICONS.dip, href: '/tools/find-the-dip' },
  { sep: true },
  { label: 'Dividend payout calendar', d: ICONS.cal, href: '/tools/payout-calendar' },
  { label: 'Portfolio Lab', d: ICONS.lab, href: '/tools/portfolio-lab' }
];

export const TAB_ROWS = [
  { label: 'Dashboard', d: ICONS.home, href: '/', section: 'Dashboard' },
  { label: 'Analytics', d: ICONS.bars, href: '/analytics', section: 'Analytics' },
  { label: 'Portfolio', d: ICONS.table, href: '/portfolio/holdings', section: 'Portfolio' },
  { label: 'Tools', d: ICONS.scale, href: '/tools/rebalancing', section: 'Tools' }
] as const;

export type Section = 'Dashboard' | 'Analytics' | 'Portfolio' | 'Tools';
