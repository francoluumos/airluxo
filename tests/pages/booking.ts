import { type Page } from '@playwright/test';

// Page object for the car-detail booking modal.
export class BookingModal {
  constructor(private readonly page: Page) {}

  // Open the calendar and select a 2-day range from the first available days.
  async pickDates() {
    await this.page.getByRole('button', { name: 'Select dates' }).click();
    const days = this.page
      .getByTestId('calendar')
      .getByRole('button', { name: /^\d+$/ })
      .and(this.page.locator('button:enabled'));
    await days.first().click();
    await days.nth(2).click();
  }

  reserveButton() {
    return this.page.getByRole('button', { name: 'Reserve now' });
  }

  async reserve() {
    await this.reserveButton().click();
  }
}
