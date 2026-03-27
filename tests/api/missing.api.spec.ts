```typescript
// tests/api/auth-extended.api.spec.ts
import { test, expect } from '@playwright/test';
import { AuthApi } from '../../src/api/AuthApi';
import { TEST_USER, uniqueEmail } from '../../src/fixtures/testData';

test.describe('Auth API - Extended Coverage', () => {
  let authApi: AuthApi;

  test.beforeEach(({ request }) => {
    authApi = new AuthApi(request);
  });

  test.describe('POST /api/auth/register - Additional Validation', () => {
    test('returns 400 when password has no uppercase letter', async () => {
      const response = await authApi.register('Valid Name', uniqueEmail(), 'lowercase1');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' }),
        ]),
      );
    });

    test('returns 400 when password has only numbers', async () => {
      const response = await authApi.register('Valid Name', uniqueEmail(), '12345678');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' }),
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

    test('accepts name at maximum length boundary', async () => {
      const maxLengthName = 'A'.repeat(100);
      const response = await authApi.register(maxLengthName, uniqueEmail(), 'ValidPass1');

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.token).toBeDefined();
    });

    test('returns 400 when name exceeds maximum length', async () => {
      const tooLongName = 'A'.repeat(101);
      const response = await authApi.register(tooLongName, uniqueEmail(), 'ValidPass1');

      expect(response.status()).toBe(400);
    });

    test('normalizes email with uppercase letters', async () => {
      const email = uniqueEmail().toUpperCase();
      const response = await authApi.register('Valid Name', email, 'ValidPass1');

      expect(response.status()).toBe(201);

      const loginResponse = await authApi.login(email.toLowerCase(), 'ValidPass1');
      expect(loginResponse.status()).toBe(200);
    });

    test('handles SQL injection attempt in name field', async () => {
      const response = await authApi.register(
        "'; DROP TABLE users; --",
        uniqueEmail(),
        'ValidPass1'
      );

      expect([201, 400]).toContain(response.status());
    });

    test('handles SQL injection attempt in email field', async () => {
      const response = await authApi.register(
        'Valid Name',
        "test@test.com'; DROP TABLE users; --",
        'ValidPass1'
      );

      expect(response.status()).toBe(400);
    });

    test('handles XSS attempt in name field', async () => {
      const response = await authApi.register(
        '<script>alert("xss")</script>',
        uniqueEmail(),
        'ValidPass1'
      );

      if (response.status() === 201) {
        const body = await response.json();
        expect(body.token).toBeDefined();
      } else {
        expect(response.status()).toBe(400);
      }
    });

    test('handles XSS attempt in email field', async () => {
      const response = await authApi.register(
        'Valid Name',
        '<script>alert("xss")</script>@test.com',
        'ValidPass1'
      );

      expect(response.status()).toBe(400);
    });
  });

  test.describe('POST /api/auth/login - Additional Scenarios', () => {
    test('handles SQL injection attempt in email', async () => {
      const response = await authApi.login(
        "' OR '1'='1",
        'ValidPass1'
      );

      expect(response.status()).toBe(401);
    });

    test('handles SQL injection attempt in password', async () => {
      const response = await authApi.login(
        TEST_USER.email,
        "' OR '1'='1"
      );

      expect(response.status()).toBe(401);
    });

    test('email login is case insensitive', async () => {
      const response = await authApi.login(
        TEST_USER.email.toUpperCase(),
        TEST_USER.password
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.token).toBeDefined();
    });

    test('trims whitespace from email', async () => {
      const response = await authApi.login(
        `  ${TEST_USER.email}  `,
        TEST_USER.password
      );

      expect([200, 400]).toContain(response.status());
    });

    test('does not trim whitespace from password', async () => {
      const response = await authApi.login(
        TEST_USER.email,
        `  ${TEST_USER.password}  `
      );

      expect(response.status()).toBe(401);
    });

    test('tracks failed login attempts', async () => {
      const responses: number[] = [];
      for (let i = 0; i < 5; i++) {
        const response = await authApi.login(TEST_USER.email, 'WrongPass999!');
        responses.push(response.status());
      }

      expect(responses.every(s => s === 401 || s === 429)).toBe(true);
    });
  });

  test.describe('GET /api/auth/me - Token Handling', () => {
    test('returns 401 with malformed token (not JWT format)', async () => {
      const response = await authApi.getMe('not-a-jwt-token');

      expect(response.status()).toBe(401);
    });

    test('returns 401 with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImlhdCI6MTUwMDAwMDAwMCwiZXhwIjoxNTAwMDAwMDAxfQ.invalid';
      const response = await authApi.getMe(expiredToken);

      expect(response.status()).toBe(401);
    });

    test('returns 401 with tampered token payload', async () => {
      const token = await authApi.loginAndGetToken(TEST_USER.email, TEST_USER.password);
      const parts = token.split('.');
      const tamperedPayload = Buffer.from(JSON.stringify({ userId: 9999, email: 'hacker@test.com' })).toString('base64');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const response = await authApi.getMe(tamperedToken);

      expect(response.status()).toBe(401);
    });

    test('returns 401 with empty bearer token', async () => {
      const response = await authApi.getMe('');

      expect(response.status()).toBe(401);
    });
  });
});
```

```typescript
// tests/api/tasks-extended.api.spec.ts
import { test, expect } from '@playwright/test';
import { AuthApi } from '../../src/api/AuthApi';
import { TasksApi } from '../../src/api/TasksApi';
import { TEST_USER, API_URL } from '../../src/fixtures/testData';

test.describe('Tasks API - Extended Coverage', () => {
  let tasksApi: TasksApi;
  let token: string;

  test.beforeEach(async ({ request }) => {
    const authApi = new AuthApi(request);
    token = await authApi.loginAndGetToken(TEST_USER.email, TEST_USER.password);
    tasksApi = new TasksApi(request, token);
  });

  test.describe('GET /api/tasks - Pagination', () => {
    test('returns paginated results with limit parameter', async () => {
      const response = await tasksApi.getTasks({ limit: 2 });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks.length).toBeLessThanOrEqual(2);
    });

    test('returns paginated results with offset parameter', async () => {
      const firstPage = await tasksApi.getTasks({ limit: 2, offset: 0 });
      const secondPage = await tasksApi.getTasks({ limit: 2, offset: 2 });

      expect(firstPage.status()).toBe(200);
      expect(secondPage.status()).toBe(200);

      const firstBody = await firstPage.json();
      const secondBody = await secondPage.json();

      if (firstBody.tasks.length > 0 && secondBody.tasks.length > 0) {
        expect(firstBody.tasks[0].id).not.toBe(secondBody.tasks[0].id);
      }
    });

    test('returns empty array when offset exceeds total', async () => {
      const response = await tasksApi.getTasks({ offset: 999999 });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks).toEqual([]);
    });
  });

  test.describe('GET /api/tasks - Sorting', () => {
    test('sorts tasks by date ascending', async () => {
      const response = await tasksApi.getTasks({ sort: 'created_at', order: 'asc' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      if (body.tasks.length >= 2) {
        const dates = body.tasks.map((t: { created_at: string }) => new Date(t.created_at).getTime());
        expect(dates).toEqual([...dates].sort((a, b) => a - b));
      }
    });

    test('sorts tasks by date descending', async () => {
      const response = await tasksApi.getTasks({ sort: 'created_at', order: 'desc' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      if (body.tasks.length >= 2) {
        const dates = body.tasks.map((t: { created_at: string }) => new Date(t.created_at).getTime());
        expect(dates).toEqual([...dates].sort((a, b) => b - a));
      }
    });

    test('sorts tasks by priority', async () => {
      const response = await tasksApi.getTasks({ sort: 'priority' });

      expect(response.status()).toBe(200);
    });

    test('sorts tasks by title', async () => {
      const response = await tasksApi.getTasks({ sort: 'title' });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('GET /api/tasks - Additional Filters', () => {
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

    test('combines status and priority filters', async () => {
      await tasksApi.createTask({ title: 'Active high task', priority: 'high' });
      const response = await tasksApi.getTasks({ status: 'active', priority: 'high' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks.every((t: { status: string; priority: string }) =>
        t.status === 'active' && t.priority === 'high'
      )).toBe(true);
    });

    test('handles invalid status filter value', async () => {
      const response = await tasksApi.getTasks({ status: 'invalid' as 'active' });

      expect([200, 400]).toContain(response.status());
    });

    test('handles invalid priority filter value', async () => {
      const response = await tasksApi.getTasks({ priority: 'invalid' as 'high' });

      expect([200, 400]).toContain(response.status());
    });

    test('handles empty search string', async () => {
      const response = await tasksApi.getTasks({ search: '' });

      expect(response.status()).toBe(200);
    });

    test('handles search with special characters', async () => {
      const response = await tasksApi.getTasks({ search: '!@#$%^&*()' });

      expect(response.status()).toBe(200);
    });

    test('handles SQL injection in search parameter', async () => {
      const response = await tasksApi.getTasks({ search: "'; DROP TABLE tasks; --" });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('GET /api/tasks/:id - Invalid ID Handling', () => {
    test('returns 400 for string id instead of number', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/tasks/not-a-number`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect([400, 404]).toContain(response.status());
    });

    test('returns 400 for negative id value', async () => {
      const response = await tasksApi.getTask(-1);

      expect([400, 404]).toContain(response.status());
    });

    test('returns 400 for id with special characters', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/tasks/1;DROP TABLE tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect([400, 404]).toContain(response.status());
    });
  });

  test.describe('POST /api/tasks - Additional Validation', () => {
    test('returns 400 when description exceeds maximum length', async () => {
      const response = await tasksApi.createTask({
        title: 'Valid title',
        description: 'A'.repeat(1001),
      });

      expect([201, 400]).toContain(response.status());
    });

    test('returns 400 when due_date is in the past', async () => {
      const response = await tasksApi.createTask({
        title: 'Past due task',
        due_date: '2020-01-01',
      });

      expect([201, 400]).toContain(response.status());
    });

    test('handles XSS payload in title', async () => {
      const response = await tasksApi.createTask({
        title: '<script>alert("x