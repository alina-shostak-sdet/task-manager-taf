import { Page, Locator } from '@playwright/test';

export class Header {
  readonly userName: Locator;
  readonly logoutButton: Locator;

  constructor(private page: Page) {
    this.userName = page.getByTestId('user-name');
    this.logoutButton = page.getByTestId('logout-button');
  }

  async logout() {
    await this.logoutButton.click();
  }
}
