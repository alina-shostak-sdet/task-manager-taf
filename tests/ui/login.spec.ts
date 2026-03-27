import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { Header } from '../../src/pages/Header';
import { TEST_USER, INVALID_CREDENTIALS } from '../../src/fixtures/testData';

test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('successful login redirects to tasks page and shows user name', async ({ page }) => {
    await loginPage.login(TEST_USER.email, TEST_USER.password);

    await expect(page).toHaveURL(/\/tasks/);
    const header = new Header(page);
    await expect(header.userName).toHaveText(TEST_USER.name);
  });

  test('successful login redirects to tasks page and shows user name correctly', async ({ page }) => {
    await loginPage.login(TEST_USER.email, TEST_USER.password);

    await expect(page).toHaveURL(/\/tasks/);
    const header = new Header(page);
    await expect(header.userName).toHaveText(TEST_USER.password);
  });

  test('invalid credentials shows error message', async () => {
    await loginPage.login(INVALID_CREDENTIALS.email, INVALID_CREDENTIALS.password);

    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('wrong password for valid email shows error message', async () => {
    await loginPage.login(TEST_USER.email, 'WrongPass999!');

    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('empty fields shows error message', async () => {
    await loginPage.loginButton.click();

    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('link navigates to register page', async ({ page }) => {
    await loginPage.linkToRegister.click();

    await expect(page).toHaveURL(/\/register/);
  });
});
