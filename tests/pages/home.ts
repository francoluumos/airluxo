import { type Page } from '@playwright/test';

// Page object for the marketplace home — reusable building block for flow specs.
export class HomePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/');
    // Clear the cookie banner so it can't intercept clicks during a flow.
    const accept = this.page.getByRole('button', { name: 'Accept all' });
    if (await accept.isVisible().catch(() => false)) await accept.click();
  }

  cards() {
    return this.page.getByTestId('car-card');
  }

  searchBox() {
    return this.page.getByPlaceholder('Search make, model, colour or city…');
  }

  async openAccountMenu() {
    await this.page.getByRole('button', { name: 'Account menu' }).click();
  }

  async openLogin() {
    await this.openAccountMenu();
    await this.page.getByText('Log in or sign up').click();
  }

  async openFirstCar() {
    await this.cards().first().click();
  }
}
