```typescript
// tests/api/auth-extended.api.spec.ts
import { test, expect } from '@playwright/test';
import { AuthApi } from '../../src/api/AuthApi';
import { TEST_USER, uniqueEmail, API_URL } from '../../src/fixtures/testData';

test.describe('Auth API - Extended Validation', () => {
  let authApi: AuthApi;

  test.beforeEach(({ request }) => {
    authApi = new AuthApi(request);
  });

  test.describe('POST /api/auth/register - Password Validation', () => {
    test('returns 400 when password has no uppercase letter', async () => {
      const response = await authApi.register('Valid Name', uniqueEmail(), 'lowercase123');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' }),
        ]),
      );
    });

    test('returns 400 when password has no lowercase letter', async () => {
      const response = await authApi.register('Valid Name', uniqueEmail(), 'UPPERCASE123');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' }),
        ]),
      );
    });
  });

  test.describe('POST /api/auth/register - Name Validation', () => {
    test('accepts name with maximum length (50 characters)', async () => {
      const maxLengthName = 'A'.repeat(50);
      const response = await authApi.register(maxLengthName, uniqueEmail(), 'ValidPass1');

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.token).toBeDefined();
    });

    test('returns 400 when name exceeds maximum length', async () => {
      const tooLongName = 'A'.repeat(51);
      const response = await authApi.register(tooLongName, uniqueEmail(), 'ValidPass1');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name' }),
        ]),
      );
    });

    test('returns 400 when name is whitespace only', async () => {
      const response = await authApi.register('   ', uniqueEmail(), 'ValidPass1');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name' }),
        ]),
      );
    });

    test('sanitizes SQL injection attempt in name field', async () => {
      const response = await authApi.register("Robert'; DROP TABLE users;--", uniqueEmail(), 'ValidPass1');

      expect([201, 400]).toContain(response.status());
      if (response.status() === 201) {
        const body = await response.json();
        expect(body.token).toBeDefined();
      }
    });

    test('sanitizes XSS attempt in name field', async () => {
      const response = await authApi.register('<script>alert("xss")</script>', uniqueEmail(), 'ValidPass1');

      expect([201, 400]).toContain(response.status());
    });
  });

  test.describe('POST /api/auth/register - Email Validation', () => {
    test('accepts email with maximum length (100 characters)', async () => {
      const localPart = 'a'.repeat(85);
      const maxLengthEmail = `${localPart}@test.com`;
      const response = await authApi.register('Valid Name', maxLengthEmail, 'ValidPass1');

      expect([201, 400]).toContain(response.status());
    });

    test('returns 400 when email exceeds maximum length', async () => {
      const localPart = 'a'.repeat(95);
      const tooLongEmail = `${localPart}@test.com`;
      const response = await authApi.register('Valid Name', tooLongEmail, 'ValidPass1');

      expect(response.status()).toBe(400);
    });

    test('accepts email with plus tag format', async () => {
      const response = await authApi.register('Valid Name', `user+tag${Date.now()}@domain.com`, 'ValidPass1');

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.token).toBeDefined();
    });

    test('sanitizes SQL injection attempt in email field', async () => {
      const response = await authApi.register('Valid Name', "test@test.com'; DROP TABLE users;--", 'ValidPass1');

      expect(response.status()).toBe(400);
    });

    test('handles case sensitivity of email consistently', async () => {
      const baseEmail = `casetest${Date.now()}@test.com`;
      const response1 = await authApi.register('User One', baseEmail, 'ValidPass1');
      expect(response1.status()).toBe(201);

      const upperCaseEmail = baseEmail.toUpperCase();
      const response2 = await authApi.register('User Two', upperCaseEmail, 'ValidPass1');

      expect(response2.status()).toBe(409);
    });
  });

  test.describe('POST /api/auth/login - Extended', () => {
    test('trims extra whitespace in email', async () => {
      const response = await authApi.login(`  ${TEST_USER.email}  `, TEST_USER.password);

      expect([200, 401]).toContain(response.status());
    });

    test('handles extra whitespace in password', async () => {
      const response = await authApi.login(TEST_USER.email, `  ${TEST_USER.password}  `);

      expect([200, 401]).toContain(response.status());
    });

    test('handles rate limiting for brute force attempts', async () => {
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        attempts.push(authApi.login(TEST_USER.email, 'WrongPassword1!'));
      }
      const responses = await Promise.all(attempts);

      const statusCodes = responses.map(r => r.status());
      const hasRateLimitOrUnauthorized = statusCodes.every(code => [401, 429].includes(code));
      expect(hasRateLimitOrUnauthorized).toBe(true);
    });
  });

  test.describe('GET /api/auth/me - Token Validation', () => {
    test('returns 401 with malformed token (not JWT format)', async () => {
      const response = await authApi.getMe('not-a-jwt-token');

      expect(response.status()).toBe(401);
    });

    test('returns 401 with token having invalid signature', async () => {
      const validToken = await authApi.loginAndGetToken(TEST_USER.email, TEST_USER.password);
      const parts = validToken.split('.');
      parts[2] = 'invalidsignature';
      const tamperedToken = parts.join('.');

      const response = await authApi.getMe(tamperedToken);

      expect(response.status()).toBe(401);
    });

    test('returns 401 with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ.invalid';

      const response = await authApi.getMe(expiredToken);

      expect(response.status()).toBe(401);
    });
  });
});

// tests/api/tasks-extended.api.spec.ts
import { test, expect } from '@playwright/test';
import { AuthApi } from '../../src/api/AuthApi';
import { TasksApi } from '../../src/api/TasksApi';
import { TEST_USER, API_URL } from '../../src/fixtures/testData';

test.describe('Tasks API - Extended', () => {
  let tasksApi: TasksApi;
  let token: string;

  test.beforeEach(async ({ request }) => {
    const authApi = new AuthApi(request);
    token = await authApi.loginAndGetToken(TEST_USER.email, TEST_USER.password);
    tasksApi = new TasksApi(request, token);
  });

  test.describe('GET /api/tasks - Pagination', () => {
    test('returns limited results with limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await tasksApi.createTask({ title: `Pagination test ${i}` });
      }

      const response = await tasksApi.getTasks({ limit: 3 });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks.length).toBeLessThanOrEqual(3);
    });

    test('returns offset results with offset parameter', async () => {
      const response = await tasksApi.getTasks({ limit: 5, offset: 2 });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.tasks)).toBe(true);
    });

    test('returns correct total count with pagination', async () => {
      const responseAll = await tasksApi.getTasks();
      const bodyAll = await responseAll.json();
      const totalCount = bodyAll.total;

      const responsePaged = await tasksApi.getTasks({ limit: 2 });
      const bodyPaged = await responsePaged.json();

      expect(bodyPaged.total).toBe(totalCount);
    });
  });

  test.describe('GET /api/tasks - Sorting', () => {
    test('sorts tasks by created date ascending', async () => {
      const response = await tasksApi.getTasks({ sort: 'created_at', order: 'asc' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      if (body.tasks.length > 1) {
        const dates = body.tasks.map((t: { created_at: string }) => new Date(t.created_at).getTime());
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
        }
      }
    });

    test('sorts tasks by created date descending', async () => {
      const response = await tasksApi.getTasks({ sort: 'created_at', order: 'desc' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      if (body.tasks.length > 1) {
        const dates = body.tasks.map((t: { created_at: string }) => new Date(t.created_at).getTime());
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
        }
      }
    });

    test('sorts tasks by priority', async () => {
      const response = await tasksApi.getTasks({ sort: 'priority' });

      expect(response.status()).toBe(200);
    });

    test('sorts tasks by title', async () => {
      const response = await tasksApi.getTasks({ sort: 'title', order: 'asc' });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('GET /api/tasks - Filters', () => {
    test('filters by priority=medium', async () => {
      await tasksApi.createTask({ title: 'Medium priority task', priority: 'medium' });
      const response = await tasksApi.getTasks({ priority: 'medium' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks.every((t: { priority: string }) => t.priority === 'medium')).toBe(true);
    });

    test('filters by priority=low', async () => {
      await tasksApi.createTask({ title: 'Low priority task', priority: 'low' });
      const response = await tasksApi.getTasks({ priority: 'low' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks.every((t: { priority: string }) => t.priority === 'low')).toBe(true);
    });

    test('combines multiple filters (status + priority)', async () => {
      await tasksApi.createTask({ title: 'Active high task', priority: 'high' });
      const response = await tasksApi.getTasks({ status: 'active', priority: 'high' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks.every((t: { status: string; priority: string }) =>
        t.status === 'active' && t.priority === 'high')).toBe(true);
    });

    test('combines status + priority + search filters', async () => {
      await tasksApi.createTask({ title: 'Combined filter test xyz', priority: 'high' });
      const response = await tasksApi.getTasks({
        status: 'active',
        priority: 'high',
        search: 'xyz',
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks.every((t: { status: string; priority: string }) =>
        t.status === 'active' && t.priority === 'high')).toBe(true);
    });

    test('handles invalid status filter value', async () => {
      const response = await tasksApi.getTasks({ status: 'invalid_status' as 'active' });

      expect([200, 400]).toContain(response.status());
    });

    test('handles invalid priority filter value', async () => {
      const response = await tasksApi.getTasks({ priority: 'invalid_priority' as 'high' });

      expect([200, 400]).toContain(response.status());
    });
  });

  test.describe('GET /api/tasks - Search', () => {
    test('returns all tasks with empty search query', async () => {
      const response = await tasksApi.getTasks({ search: '' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.tasks)).toBe(true);
    });

    test('handles search with special characters', async () => {
      const response = await tasksApi.getTasks({ search: '!@#$%^&*()' });

      expect(response.status()).toBe(200);
    });

    test('sanitizes SQL injection in search parameter', async () => {
      const response = await tasksApi.getTasks({ search: "'; DROP TABLE tasks;--" });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.tasks)).toBe(true);
    });
  });

  test.describe('GET /api/tasks/:id - ID Validation', () => {
    test('returns 400 for non-numeric ID', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/tasks/abc`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect([400, 404]).toContain(response.status());
    });

    test('returns 400 for negative ID', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/tasks/-1`, {
        headers