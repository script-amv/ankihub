import { expect, test } from '@playwright/test';

test('demo loads and refreshes without contacting Anki; filters and mobile fit work', async ({ page }) => {
  let requests = 0;
  await page.route('http://127.0.0.1:8765/**', route => { requests++; return route.abort(); });
  await page.goto('/');
  await expect(page.locator('.focus-count')).toContainText('84');
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByLabel('Deck filter').selectOption('Design');
  await expect(page.locator('.focus-count')).toContainText('0');
  await expect(page.locator('.motivation')).toContainText('All caught up');
  await expect(page.locator('.connection')).toHaveText('Demo · sample data');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(requests).toBe(0);
});

test('live failure clears demo values, explains connection, and can return to demo', async ({ page }) => {
  await page.route('http://127.0.0.1:8765/**', route => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect your Anki' }).click();
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Open Anki');
  await expect(page.locator('.focus-count')).toContainText('—');
  await page.getByRole('button', { name: 'Explore demo' }).click();
  await expect(page.locator('.focus-count')).toContainText('84');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('live refresh preserves a stale snapshot after permission is denied', async ({ page }) => {
  let deny = false;
  await page.route('http://127.0.0.1:8765/**', route => {
    if (deny) return route.fulfill({ status: 403, body: '' });
    const { action } = route.request().postDataJSON();
    const replies: Record<string, unknown> = { version: 6, getActiveProfile: 'Fixture', deckNamesAndIds: { Test: 1 }, getDeckStats: { '1': { name: 'Test', new_count: 2, learn_count: 1, review_count: 4 } }, cardReviews: [] };
    return route.fulfill({ json: { result: replies[action], error: null } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect your Anki' }).click();
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.locator('.focus-count')).toContainText('7');
  deny = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Connection blocked');
  await expect(page.getByRole('alert')).toContainText('last successful snapshot');
  await expect(page.locator('.focus-count')).toContainText('7');
});
