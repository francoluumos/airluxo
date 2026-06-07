import { test as setup, expect } from '@playwright/test';

// Auth fixture: logs in once as a partner (email + password) and saves the session
// to a storageState file that logged-in specs reuse. Skips when creds aren't set
// (e.g. CI without secrets) → the logged-in project then has nothing to run.
//
// Set E2E_PARTNER_EMAIL / E2E_PARTNER_PASSWORD (a partner test account).

export const PARTNER_STATE = 'tests/.auth/partner.json';

setup('authenticate as partner', async ({ page }) => {
  const email = process.env.E2E_PARTNER_EMAIL;
  const password = process.env.E2E_PARTNER_PASSWORD;
  if (!email || !password) {
    // No creds (e.g. CI without secrets): write an empty session so the logged-in
    // project can still load its storageState; its specs then skip themselves.
    await page.context().storageState({ path: PARTNER_STATE });
    setup.skip(true, 'E2E_PARTNER_EMAIL / E2E_PARTNER_PASSWORD not set');
    return;
  }

  await page.goto('/?partner');
  const accept = page.getByRole('button', { name: 'Accept all' });
  if (await accept.isVisible().catch(() => false)) await accept.click();

  await page.getByRole('textbox', { name: 'Work email' }).fill(email!);
  await page.getByRole('textbox', { name: 'Password' }).fill(password!);
  await page.getByRole('button', { name: 'Enter dashboard' }).click();

  // Dashboard loaded → session is established.
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 15_000 });
  await page.context().storageState({ path: PARTNER_STATE });
});
