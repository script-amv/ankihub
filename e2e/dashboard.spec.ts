import { expect, test, type Page } from '@playwright/test';

async function mockLive(page: Page, failing: () => boolean = () => false) {
  const calls: string[] = [];
  await page.route('http://127.0.0.1:8765/**', route => {
    if (failing()) return route.abort();
    const payload = route.request().postDataJSON();
    expect(payload).not.toHaveProperty('key');
    calls.push(payload.action);
    const now = Date.now();
    const replies: Record<string, unknown> = {
      version: 6, getActiveProfile: 'Fixture', deckNamesAndIds: { Test: 1, 'Test::Words': 2 },
      getDeckStats: { '1': { name: 'Test', new_count: 2, learn_count: 1, review_count: 4 }, '2': { name: 'Words', new_count: 2, learn_count: 1, review_count: 4 } },
      cardReviews: payload.params.deck === 'Test' ? [] : [
        [now - 1000, 1, 0, 3, 1, 1, 2500, 1000, 0],
        [now - 40 * 86400000, 1, 0, 3, 1, 1, 2500, 1000, 0],
        [now - 2000, 2, 0, 3, 1, 1, 2500, 1000, 0],
      ],
    };
    return route.fulfill({ json: { result: replies[payload.action], error: null } });
  });
  return calls;
}

test('automatically connects and filters history without more network requests', async ({ page }) => {
  const calls = await mockLive(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  await expect(page.locator('.focus-count')).toContainText('7');
  await expect(page.locator('.history-values > div').nth(2)).toContainText('2');
  await expect(page.getByRole('button', { name: 'Connection settings' })).toHaveCount(0);
  await expect(page.locator('select, input[type=password]')).toHaveCount(0);
  const count = calls.length;
  await page.getByRole('button', { name: 'History range' }).click();
  await page.getByRole('option', { name: 'Last 7 days', exact: true }).click();
  await expect(page.locator('.history-values > div').nth(2)).toContainText('1');
  await expect(page.locator('.history-values > div').first()).toContainText('2');
  await page.getByRole('button', { name: 'Deck filter' }).click();
  await page.getByRole('combobox', { name: 'Search decks' }).fill('words');
  await page.getByRole('option', { name: 'Test / Words', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Deck filter' })).toContainText('Test / Words');
  expect(calls.length).toBe(count);
});

test('failed auto-connect shows demo, with a single button that retries into live data', async ({ page }) => {
  let fail = true;
  await mockLive(page, () => fail);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Connect', exact: true })).toBeEnabled();
  await expect(page.locator('.release-banner')).toContainText('Demo data · Connect Anki');
  await expect(page.locator('.focus-count')).toContainText('84');
  await expect(page.getByRole('alert')).toContainText('Open Anki');
  fail = false;
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  await expect(page.locator('.focus-count')).toContainText('7');
  await expect(page.locator('.release-banner')).toHaveCount(0);
});

test('failed refresh keeps real data and changes the button back to Connect', async ({ page }) => {
  let fail = false;
  await mockLive(page, () => fail);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  fail = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('last successful snapshot');
  await expect(page.getByRole('button', { name: 'Connect', exact: true })).toBeEnabled();
  await expect(page.locator('.focus-count')).toContainText('7');
  await expect(page.locator('.release-banner')).toHaveCount(0);
});

test('button counts completed decks and remains disabled until loading finishes', async ({ page }) => {
  let finish!: () => void;
  const waiting = new Promise<void>(resolve => { finish = resolve; });
  let profiles = 0;
  await page.route('http://127.0.0.1:8765/**', async route => {
    const { action, params } = route.request().postDataJSON();
    if (action === 'cardReviews' && params.deck === 'B') await waiting;
    if (action === 'getActiveProfile') profiles++;
    const replies: Record<string, unknown> = { version:6, getActiveProfile:'Fixture',
      deckNamesAndIds:{A:1,B:2}, getDeckStats:{}, cardReviews:[] };
    await route.fulfill({json:{result:replies[action],error:null}});
  });
  await page.goto('/');
  const button = page.getByRole('button', { name: '1 / 2 decks', exact: true });
  await expect(button).toBeVisible();
  await expect(button).toBeDisabled();
  await expect(page.locator('.footer')).not.toContainText('decks');
  expect(profiles).toBe(1);
  finish();
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  expect(profiles).toBe(2);
});

test('custom menus support searching, keyboard focus, dismissal, and mobile positioning', async ({ page }) => {
  await page.route('http://127.0.0.1:8765/**', route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Connect', exact: true })).toBeEnabled();
  const deck = page.getByRole('button', { name: 'Deck filter' });
  await deck.focus();
  await page.keyboard.press('ArrowDown');
  const search = page.getByRole('combobox', { name: 'Search decks' });
  await expect(search).toBeFocused();
  await search.fill('not a deck');
  await expect(page.getByRole('status')).toHaveText('No decks found');
  await search.fill('Design');
  await page.keyboard.press('Enter');
  await expect(deck).toBeFocused();
  await expect(page.locator('.motivation')).toContainText('All caught up');
  expect(await deck.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('none');
  await deck.click();
  await page.keyboard.press('Escape');
  await expect(deck).toBeFocused();
  await deck.click();
  await page.getByRole('heading', { level:1 }).click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
  const range = page.getByRole('button', { name: 'History range' });
  await range.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(range).toContainText('Last 30 days');
  await expect(range).toBeFocused();
  await page.setViewportSize({ width:390, height:844 });
  for (const control of [deck, range]) {
    await control.click();
    const box = await page.locator('.dropdown-panel').boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    await page.keyboard.press('Escape');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
