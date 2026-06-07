import { test, expect } from '@playwright/test';
import { HomePage } from './pages/home';

// Marketplace flows. Skip gracefully if no listings loaded (e.g. CI without the
// Supabase secrets), so these never flake on a data-less environment.

test('collection: search narrows the grid', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await page.waitForTimeout(500);
  const before = await home.cards().count();
  test.skip(before === 0, 'no listings loaded');

  await home.searchBox().fill('zzdoesnotexist');
  await page.waitForTimeout(500);
  expect(await home.cards().count()).toBeLessThan(before);
});

test('opening a car shows its booking detail', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await page.waitForTimeout(500);
  test.skip(await home.cards().count() === 0, 'no listings loaded');

  await home.openFirstCar();
  // The detail modal is open: its "Back to fleet" control is present.
  await expect(page.getByRole('button', { name: /Back to fleet/i })).toBeVisible();
});
