import { test, expect } from '@playwright/test';

const screens = [
  ['/portfolio/cash', 'Cash'], ['/tools/rebalancing', 'Portfolio rebalancing'],
  ['/analytics/diversification', 'Diversification'], ['/analytics/dividends', 'Dividends'],
  ['/analytics/growth', 'Growth'], ['/analytics/metrics', 'Metrics'], ['/analytics/report', 'Report'],
  ['/tools/screener', 'Top dividend stocks'], ['/tools/find-the-dip', 'Find the Dip'],
  ['/tools/payout-calendar', 'Dividend payout calendar'], ['/tools/portfolio-lab', 'Portfolio Lab']
];

for (const [route, heading] of screens) {
  test(`${heading} renders and hydrates on desktop and mobile`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText(heading);
    await expect(page.locator('main')).not.toContainText('undefined');
    await page.getByRole('button', { name: 'AK', exact: true }).click();
    await page.getByRole('button', { name: 'dark', exact: true }).click();
    await page.getByRole('button', { name: 'AK', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.setViewportSize({ width: 390, height: 844 });
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    if (width > 391) console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(el => ({ tag: el.tagName, text: el.textContent?.slice(0, 45), width: el.getBoundingClientRect().width, right: el.getBoundingClientRect().right }))));
    expect(width).toBeLessThanOrEqual(391);
    expect(errors).toEqual([]);
  });
}

test('cash filters movements and expands results', async ({ page }) => {
  await page.goto('/portfolio/cash');
  await page.getByRole('button', { name: 'Deposits', exact: true }).click();
  await expect(page.locator('main')).toContainText('matching movements');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByPlaceholder('Filter by ticker…').fill('not-a-ticker');
  await expect(page.getByText('No movements match')).toBeVisible();
});

test('buy-only rebalancing updates its plan', async ({ page }) => {
  await page.goto('/tools/rebalancing');
  await page.getByRole('button', { name: 'New cash only', exact: true }).click();
  await expect(page.getByText('Cash to invest', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '$2,500', exact: true }).click();
  await expect(page.locator('main')).toContainText('$2,500.00 of new cash');
  await page.getByRole('button', { name: 'Whole shares only', exact: true }).click();
  await expect(page.locator('main')).toContainText('rounding');
});

test('fund X-Ray changes exposure rows', async ({ page }) => {
  await page.goto('/analytics/diversification');
  await page.getByRole('button', { name: /X-Ray Funds/ }).click();
  await expect(page.locator('main')).toContainText('look-through lines');
  await expect(page.locator('main')).toContainText('Microsoft');
  await page.getByRole('button', { name: 'Countries', exact: true }).click();
  await expect(page.locator('main')).toContainText('United States');
});

test('watchlist survives reload and is shared with Find the Dip', async ({ page, request }) => {
  const original = (await (await request.get('http://localhost:3001/api/research/snapshot')).json()).preferences;
  try {
    await page.goto('/tools/screener');
    const star = page.locator('main button[title*="watchlist"]').first();
    const title = await star.getAttribute('title');
    await star.click();
    await expect.poll(async () => (await (await request.get('http://localhost:3001/api/research/snapshot')).json()).preferences.watchlist).not.toEqual(original.watchlist);
    await page.reload();
    await expect(page.locator('main button[title*="watchlist"]').first()).not.toHaveAttribute('title', title!);
    await page.goto('/tools/find-the-dip');
    await page.getByRole('button', { name: 'Watchlist', exact: true }).click();
    await expect(page.locator('main')).not.toContainText('undefined');
  } finally { await request.post('http://localhost:3001/api/research/preferences', { data: original }); }
});
