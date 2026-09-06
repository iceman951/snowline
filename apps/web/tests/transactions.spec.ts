import { test, expect } from '@playwright/test';

test('saves a trade, closes the dialog and retains the row after reload', async ({ page }, testInfo) => {
  await page.goto('/portfolio/transactions');
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Ticker/Company').fill('SCHD');
  await dialog.getByLabel('Shares', { exact: false }).fill('2');
  await dialog.getByLabel('Price', { exact: false }).fill('30');
  await dialog.getByLabel('Fee', { exact: true }).fill('1');
  await dialog.getByLabel('Note').fill('Browser trade persistence');
  await dialog.getByLabel('Update cash balance').check();
  await expect(dialog.getByText('After transaction:')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('trades-desktop.png') });
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Transaction saved.');
  await page.reload();
  await page.getByPlaceholder('Search', { exact: true }).fill('Browser trade persistence');
  await expect(page.getByText('Browser trade persistence', { exact: true })).toBeVisible();
  await expect(page.getByText('Showing 1 of 1')).toBeVisible();
});

test('calculates per-share income, saves and adds more, then saves an unassigned expense', async ({ page }) => {
  await page.goto('/portfolio/transactions');
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('tab', { name: 'Incomes' }).click();
  await dialog.getByLabel('Ticker/Company').fill('SCHD');
  await dialog.getByLabel('Total received').fill('100');
  await expect(dialog.getByLabel('Per share, $')).not.toHaveValue('');
  await dialog.getByLabel('Per share, $').fill('1');
  await expect(dialog.getByLabel('Total received')).not.toHaveValue('100');
  await dialog.getByLabel('Total received').fill('100');
  await dialog.getByLabel('Fee', { exact: true }).fill('2');
  await dialog.getByLabel('Tax, $').fill('15');
  await dialog.getByLabel('Note').fill('Browser dividend');
  await dialog.getByRole('button', { name: 'Save and add more' }).click();
  await expect(dialog.getByRole('status')).toContainText('Transaction saved');
  await expect(dialog.getByLabel('Ticker/Company')).toHaveValue('');
  await expect(dialog.getByLabel('Total received')).toHaveValue('');
  await dialog.getByRole('tab', { name: 'Expenses' }).click();
  await dialog.getByLabel('Fee', { exact: false }).fill('5');
  await dialog.getByLabel('Note').fill('Browser portfolio expense');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('Browser portfolio expense', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Expenses', exact: true }).click();
  await page.getByPlaceholder('Search', { exact: true }).fill('Browser portfolio expense');
  await expect(page.getByText('Showing 1 of 1')).toBeVisible();
});

test('keeps entered values after a server validation error and allows correction', async ({ page }) => {
  await page.goto('/portfolio/transactions');
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Ticker/Company').fill('SCHD');
  await dialog.getByLabel('Operation').selectOption('Sell');
  await dialog.getByLabel('Shares', { exact: false }).fill('999999');
  await dialog.getByLabel('Price', { exact: false }).fill('30');
  await dialog.getByLabel('Note').fill('Corrected sale');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('cannot sell more');
  await expect(dialog.getByLabel('Note')).toHaveValue('Corrected sale');
  await dialog.getByLabel('Shares', { exact: false }).fill('1');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test('adds a custom asset and makes it available for subsequent transactions', async ({ page }) => {
  await page.goto('/portfolio/transactions');
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'or add a custom asset' }).click();
  await dialog.getByLabel('Ticker/Company').fill('BROWSER');
  await dialog.getByLabel('Asset name').fill('Browser custom asset');
  await dialog.getByLabel('Shares', { exact: false }).fill('3.5');
  await dialog.getByLabel('Price', { exact: false }).fill('20');
  await dialog.getByRole('button', { name: 'Save and add more' }).click();
  await expect(dialog.getByRole('status')).toBeVisible();
  await dialog.getByLabel('Ticker/Company').fill('BROWSER');
  await expect(dialog.getByText('Browser custom asset · 3.5 shares')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test('supports keyboard tabs, Escape, dark theme and all forms on mobile', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/portfolio/transactions');
  await page.getByRole('button', { name: 'AK', exact: true }).click();
  await page.getByRole('button', { name: 'dark', exact: true }).click();
  await page.getByRole('button', { name: 'AK', exact: true }).click();
  const add = page.getByRole('button', { name: 'Add transaction', exact: true });
  await add.click();
  const dialog = page.getByRole('dialog');
  for (const tab of ['Trades', 'Incomes', 'Expenses']) {
    await dialog.getByRole('tab', { name: tab }).click();
    await expect(dialog.getByRole('button', { name: 'Save and add more' })).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${tab.toLowerCase()}-mobile.png`) });
  }
  await dialog.getByRole('tab', { name: 'Expenses' }).press('Home');
  await expect(dialog.getByRole('tab', { name: 'Trades' })).toBeFocused();
  await dialog.getByRole('tab', { name: 'Trades' }).press('ArrowRight');
  await expect(dialog.getByRole('tab', { name: 'Incomes' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(add).toBeFocused();
  expect(errors).toEqual([]);
});
