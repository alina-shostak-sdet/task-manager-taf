import { Page, APIRequestContext } from '@playwright/test';
import { TEST_USER, API_URL } from '../fixtures/testData';

export async function loginViaUI(
  page: Page,
  email = TEST_USER.email,
  password = TEST_USER.password,
) {
  await page.goto('/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('login-button').click();
  await page.waitForURL('**/tasks');
}

export async function getAuthToken(
  request: APIRequestContext,
  email = TEST_USER.email,
  password = TEST_USER.password,
): Promise<string> {
  const response = await request.post(`${API_URL}/api/auth/login`, {
    data: { email, password },
  });
  const body = await response.json();
  return body.token as string;
}

export async function loginViaApi(page: Page, request: APIRequestContext): Promise<string> {
  const token = await getAuthToken(request);
  await page.goto('/login');
  await page.evaluate((t) => localStorage.setItem('token', t), token);
  await page.goto('/tasks');
  await page.waitForURL('**/tasks');
  return token;
}
