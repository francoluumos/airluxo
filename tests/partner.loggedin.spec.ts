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

test('dashboard body content renders in German after switching', async ({ page }) => {
  // A newly-extracted Overview KPI label — English baseline.
  await expect(page.getByText('Active listings')).toBeVisible();

  await page.getByLabel('Language').selectOption('de');
  await expect(page.getByLabel('Language')).toHaveValue('de');

  // The dashboard body is now translated, not falling back to English. This is
  // the guard against silently regressing to an English-only dashboard: the
  // English label is gone and its German translation (from Supabase) renders.
  await expect(page.getByText('Active listings')).toHaveCount(0);
  await expect(page.getByText('Aktive Inserate')).toBeVisible();

  // Reset so the test is idempotent.
  await page.getByLabel('Language').selectOption('en');
  await expect(page.getByText('Active listings')).toBeVisible();
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
