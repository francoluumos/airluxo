import { test, expect } from '@playwright/test';
import { HomePage } from './pages/home';

// Auth flow: the log-in / sign-up modal opens from the account menu with both
// sign-in options. (Does not submit — that would send a real magic link.)
test('login modal opens with Google + email options', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await home.openLogin();

  await expect(page.getByRole('heading', { name: /Welcome to AIRLUXO/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Continue with email/i })).toBeVisible();
});
