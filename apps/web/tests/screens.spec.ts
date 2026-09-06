import { test, expect } from '@playwright/test';

/**
 * Browser coverage for the eight screens built before the research screens.
 * Same contract as research.spec.ts: the page must render server-side, hydrate
 * without throwing, honour the theme toggle, and never scroll sideways on a phone.
 */
const screens = [
  ['/', 'US Core'], ['/portfolio/holdings', 'Holdings'],
  ['/portfolio/categories', 'Categories'], ['/portfolio/transactions', 'Transactions'],
  ['/portfolio/corporate-actions', 'Corporate actions'],
  ['/portfolio/dividend-calendar', 'Dividend calendar'], ['/portfolio/goal', 'My goal'],
  ['/analytics', 'Analytics']
];

for (const [route, heading] of screens) {
  test(`${heading} renders and hydrates on desktop and mobile`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toHaveText(heading);
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

test('dashboard masks and restores amounts', async ({ page }) => {
  await page.goto('/');
  // Masking blurs the figures rather than replacing them, as in the prototype.
  const value = page.locator('[data-r="kpi"]').getByText('$30,374.48').locator('..');
  await expect(value).toHaveCSS('filter', 'none');
  await page.getByTitle('Hide amounts').click();
  await expect(value).not.toHaveCSS('filter', 'none');
  await page.getByTitle('Show amounts').click();
  await expect(value).toHaveCSS('filter', 'none');
});

test('holdings search and sort narrow the table', async ({ page }) => {
  await page.goto('/portfolio/holdings');
  const rows = page.locator('[role="row"]');
  const all = await rows.count();
  expect(all).toBeGreaterThan(1);
  await page.getByPlaceholder('Search').fill('SCHD');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('SCHD');
  await page.getByPlaceholder('Search').fill('');
  await expect(rows).toHaveCount(all);
  await page.getByTitle('Sort').click();
  await page.getByRole('menu').getByRole('button', { name: 'Holding' }).click();
  const tickers = (await rows.allInnerTexts()).map(t => t.split('\n')[0].trim());
  expect([...tickers].sort()).toEqual(tickers);
});

test('dividend calendar walks between months', async ({ page }) => {
  await page.goto('/portfolio/dividend-calendar');
  const title = page.locator('.card-title').filter({ hasText: /\d{4}$/ }).first();
  const start = await title.innerText();
  await page.getByLabel('Next month').click();
  await expect(title).not.toHaveText(start);
  await page.getByLabel('Previous month').click();
  await expect(title).toHaveText(start);
});

test('goal recomputes when the monthly contribution changes', async ({ page }) => {
  await page.goto('/portfolio/goal');
  const main = page.locator('main');
  const before = await main.innerText();
  await page.getByLabel('Monthly contribution').fill('900');
  await expect.poll(() => main.innerText()).not.toBe(before);
});
