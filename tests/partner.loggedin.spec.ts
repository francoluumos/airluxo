import { test, expect } from '@playwright/test';

// Logged-in partner flows. Run under the "logged-in" project, which reuses the
// session saved by auth.setup.ts. Guarded so they skip cleanly when there's no
// saved session (no creds → setup skipped).

test.beforeEach(async ({ page }) => {
  await page.goto('/?partner');
  const signedIn = await page.getByRole('button', { name: 'Sign out' }).isVisible().catch(() => false);
  test.skip(!signedIn, 'no partner session (E2E creds not set)');
});

test('language switch updates the locale', async ({ page }) => {
  const lang = page.getByLabel('Language');
  await expect(lang).toBeVisible();

  await lang.selectOption('de');
  await expect(lang).toHaveValue('de');
  // Choice persists to localStorage (and the profile).
  expect(await page.evaluate(() => localStorage.getItem('airluxo:locale'))).toBe('de');

  // Reset to English so the test is idempotent.
  await lang.selectOption('en');
});

test('setup guide can be replayed from Settings', async ({ page }) => {
  // Dismiss the auto-tour if a new partner sees it on load.
  const skip = page.getByText('Skip the guide');
  if (await skip.isVisible().catch(() => false)) await skip.click();

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /Replay setup guide/i }).click();

  // The tour overlay is up.
  await expect(page.getByText('Skip the guide')).toBeVisible();
});
