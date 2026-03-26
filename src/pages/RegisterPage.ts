import { Page, Locator } from '@playwright/test';

export class RegisterPage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly registerButton: Locator;
  readonly errorMessage: Locator;
  readonly fieldErrorName: Locator;
  readonly fieldErrorEmail: Locator;
  readonly fieldErrorPassword: Locator;
  readonly fieldErrorConfirmPassword: Locator;
  readonly linkToLogin: Locator;

  constructor(private page: Page) {
    this.nameInput = page.getByTestId('name-input');
    this.emailInput = page.getByTestId('email-input');
    this.passwordInput = page.getByTestId('password-input');
    this.confirmPasswordInput = page.getByTestId('confirm-password-input');
    this.registerButton = page.getByTestId('register-button');
    this.errorMessage = page.getByTestId('error-message');
    this.fieldErrorName = page.getByTestId('field-error-name');
    this.fieldErrorEmail = page.getByTestId('field-error-email');
    this.fieldErrorPassword = page.getByTestId('field-error-password');
    this.fieldErrorConfirmPassword = page.getByTestId('field-error-confirm-password');
    this.linkToLogin = page.getByTestId('link-to-login');
  }

  async goto() {
    await this.page.goto('/register');
  }

  async register(name: string, email: string, password: string, confirmPassword: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.registerButton.click();
  }
}
