import { test, expect } from '@playwright/test';

test('refresh button reloads page data and reports quote dates and cooldown errors', async ({ page }) => {
  let updated = false;
  const status = () => ({ source: 'yfinance', refreshing: false, error: null, entries: [{
    ticker: 'AMZN', asOf: '2026-09-04T00:00:00-04:00',
    fetchedAt: updated ? '2026-09-07T12:00:00Z' : null, state: updated ? 'cached' : 'stored'
  }] });
  await page.route('**/api/market/status', route => route.fulfill({ json: status() }));
  await page.route('**/api/market/refresh', route => {
    if (updated) return route.fulfill({ status: 429, json: { error: 'กรุณารอ 60 วินาทีก่อนอัปเดตอีกครั้ง' } });
    updated = true;
    return route.fulfill({ json: status() });
  });
  await page.goto('/portfolio/holdings', { waitUntil: 'domcontentloaded' });
  const button = page.getByRole('button', { name: 'อัปเดตราคา', exact: true });
  await expect(button).toBeVisible();
  const reload = page.waitForRequest(request => request.url().includes('/portfolio/holdings/__data.json'));
  await button.click();
  await reload;
  await expect(page.getByRole('status')).toHaveText('อัปเดตราคาแล้ว');
  await page.locator('.market-status summary').click();
  await expect(page.locator('.market-status table')).toContainText('2026-09-04');
  await expect(page.locator('.market-status table')).toContainText('แคชวันนี้');
  await button.click();
  await expect(page.getByRole('status')).toContainText('60 วินาที');
  await expect(button).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});
