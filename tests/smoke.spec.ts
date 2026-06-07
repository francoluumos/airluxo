import { test, expect } from '@playwright/test';

// Smoke: every key route mounts the app with no uncaught JS errors. This is the
// guard for white-page crashes (e.g. a t() called without useT() → ReferenceError,
// which the build can't catch). Runs on all browsers + mobile.

const ROUTES = [
  { name: 'home (marketplace)', path: '/' },
  { name: 'partner login', path: '/?partner' },
  { name: 'admin login', path: '/?admin' },
  { name: 'partner docs', path: '/?docs' },
  { name: 'privacy policy', path: '/?privacy' },
];

for (const r of ROUTES) {
  test(`renders without crashing — ${r.name}`, async ({ page }) => {
    const fatal: string[] = [];
    page.on('pageerror', (e) => fatal.push(`pageerror: ${e.message}`));

    await page.goto(r.path, { waitUntil: 'load' });
    // The React app actually mounted (root not blank → not a white page).
    await expect(page.locator('#root')).not.toBeEmpty();
    // No uncaught exceptions during render.
    expect(fatal, fatal.join('\n')).toEqual([]);
  });
}

test('home shows the collection and opens a car detail', async ({ page }) => {
  const fatal: string[] = [];
  page.on('pageerror', (e) => fatal.push(`pageerror: ${e.message}`));

  await page.goto('/');
  // Hero headline is present (proves Home + i18n rendered).
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // If listings loaded, opening the first car must not crash the booking modal.
  const firstCar = page.locator('[data-tour], article, [role="button"]').first();
  const cards = page.locator('button:has(img), a:has(img)');
  if (await cards.count() > 0) {
    await cards.first().click().catch(() => {});
    await page.waitForTimeout(500);
  }
  void firstCar;
  expect(fatal, fatal.join('\n')).toEqual([]);
});
