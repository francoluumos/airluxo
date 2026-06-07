import { test, expect } from '@playwright/test';
import { HomePage } from './pages/home';
import { BookingModal } from './pages/booking';

// Booking flow up to the details step. Stops before licence/payment (which need
// an AI licence scan + Stripe), and before submitting (no DB write). Skips if no
// listings loaded.
test('booking: pick dates → reserve → reach the details step', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await page.waitForTimeout(500);
  test.skip(await home.cards().count() === 0, 'no listings loaded');

  await home.openFirstCar();
  await expect(page.getByRole('button', { name: /Back to fleet/i })).toBeVisible();

  const booking = new BookingModal(page);
  await booking.pickDates();
  // Choosing dates enables Reserve and recomputes the price.
  await expect(booking.reserveButton()).toBeEnabled();
  await booking.reserve();

  // The details step (Step 1 of 2) appears with the contact fields.
  await expect(page.getByText('Your details · Step 1 of 2')).toBeVisible();
  await expect(page.getByPlaceholder('Email', { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Phone', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Continue/ })).toBeVisible();
});
