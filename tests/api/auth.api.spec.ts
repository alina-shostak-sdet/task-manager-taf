import { test, expect } from '@playwright/test';
import { AuthApi } from '../../src/api/AuthApi';
import { TEST_USER, INVALID_CREDENTIALS, uniqueEmail } from '../../src/fixtures/testData';

test.describe('Auth API', () => {
  let authApi: AuthApi;

  test.beforeEach(({ request }) => {
    authApi = new AuthApi(request);
  });

  test.describe('POST /api/auth/register', () => {
    test('registers new user and returns token', async () => {
      const response = await authApi.register('New User', uniqueEmail(), 'ValidPass1');

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.token).toBeDefined();
      expect(typeof body.token).toBe('string');
    });

    test('returns 400 when email already exists', async () => {
      const response = await authApi.register('John Doe', TEST_USER.email, TEST_USER.password);

      expect(response.status()).toBe(409);
    });

    test('returns 400 when name is too short', async () => {
      const response = await authApi.register('A', uniqueEmail(), 'ValidPass1');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name' }),
        ]),
      );
    });

    test('returns 400 when email format is invalid', async () => {
      const response = await authApi.register('Valid Name', 'not-an-email', 'ValidPass1');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
        ]),
      );
    });

    test('returns 400 when password has no number', async () => {
      const response = await authApi.register('Valid Name', uniqueEmail(), 'onlyletters');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' }),
        ]),
      );
    });

    test('returns 400 when password is too short', async () => {
      const response = await authApi.register('Valid Name', uniqueEmail(), 'Ab1');

      expect(response.status()).toBe(400);
    });
  });

  test.describe('POST /api/auth/login', () => {
    test('returns token on valid credentials', async () => {
      const response = await authApi.login(TEST_USER.email, TEST_USER.password);

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.token).toBeDefined();
    });

    test('returns 401 on wrong password', async () => {
      const response = await authApi.login(TEST_USER.email, 'WrongPass999!');

      expect(response.status()).toBe(401);
    });

    test('returns 401 on non-existent email', async () => {
      const response = await authApi.login(INVALID_CREDENTIALS.email, INVALID_CREDENTIALS.password);

      expect(response.status()).toBe(401);
    });

    test('returns 400 when email is missing', async () => {
      const response = await authApi.login('', TEST_USER.password);

      expect(response.status()).toBe(400);
    });

    test('returns 400 when password is missing', async () => {
      const response = await authApi.login(TEST_USER.email, '');

      expect(response.status()).toBe(400);
    });
  });

  test.describe('GET /api/auth/me', () => {
    test('returns user data with valid token', async () => {
      const token = await authApi.loginAndGetToken(TEST_USER.email, TEST_USER.password);
      const response = await authApi.getMe(token);

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.email).toBe(TEST_USER.email);
      expect(body.name).toBe(TEST_USER.name);
      expect(body.password).toBeUndefined();
    });

    test('returns 401 without token', async ({ request }) => {
      const response = await request.get('http://localhost:3000/api/auth/me');

      expect(response.status()).toBe(401);
    });

    test('returns 401 with invalid token', async () => {
      const response = await authApi.getMe('invalid.token.here');

      expect(response.status()).toBe(401);
    });
  });
});
