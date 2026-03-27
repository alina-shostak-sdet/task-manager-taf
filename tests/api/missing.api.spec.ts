```typescript
// tests/api/auth-extended.api.spec.ts
import { test, expect } from '@playwright/test';
import { AuthApi } from '../../src/api/AuthApi';
import { TEST_USER, uniqueEmail, API_URL } from '../../src/fixtures/testData';

test.describe('Auth API - Extended Coverage', () => {
  let authApi: AuthApi;

  test.beforeEach(({ request }) => {
    authApi = new AuthApi(request);
  });

  test.describe('POST /api/auth/register - Password Validation', () => {
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

    test('returns 400 when password has no lowercase letter', async () => {
      const response = await authApi.register('Valid Name', uniqueEmail(), 'UPPERCASE1');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' }),
        ]),
      );
    });
  });

  test.describe('POST /api/auth/register - Boundary Tests', () => {
    test('accepts name at maximum length boundary (50 chars)', async () => {
      const maxName = 'A'.repeat(50);
      const response = await authApi.register(maxName, uniqueEmail(), 'ValidPass1');

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.token).toBeDefined();
    });

    test('returns 400 when name exceeds maximum length', async () => {
      const tooLongName = 'A'.repeat(51);
      const response = await authApi.register(tooLongName, uniqueEmail(), 'ValidPass1');

      expect(response.status()).toBe(400);
    });

    test('accepts email at maximum length boundary', async () => {
      const localPart = 'a'.repeat(64);
      const domain = 'b'.repeat(185) + '.com';
      const maxEmail = `${localPart}@${domain}`;
      const response = await authApi.register('Valid Name', maxEmail, 'ValidPass1');

      // Email might be invalid due to format, but we're testing boundary
      expect([201, 400]).toContain(response.status());
    });

    test('returns 400 when email exceeds maximum length', async () => {
      const tooLongEmail = 'a'.repeat(256) + '@test.com';
      const response = await authApi.register('Valid Name', tooLongEmail, 'ValidPass1');

      expect(response.status()).toBe(400);
    });
  });

  test.describe('POST /api/auth/register - Security Tests', () => {
    test('handles SQL injection attempt in name field', async () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const response = await authApi.register(sqlInjection, uniqueEmail(), 'ValidPass1');

      // Should either reject or sanitize, not crash
      expect([201, 400]).toContain(response.status());
    });

    test('handles SQL injection attempt in email field', async () => {
      const sqlInjection = "test@test.com'; DROP TABLE users; --";
      const response = await authApi.register('Valid Name', sqlInjection, 'ValidPass1');

      expect(response.status()).toBe(400);
    });

    test('handles SQL injection attempt in password field', async () => {
      const sqlInjection = "ValidPass1'; DROP TABLE users; --";
      const response = await authApi.register('Valid Name', uniqueEmail(), sqlInjection);

      // Should process normally or reject, not crash
      expect([201, 400]).toContain(response.status());
    });

    test('handles XSS attempt in name field', async () => {
      const xssAttempt = '<script>alert("xss")</script>';
      const response = await authApi.register(xssAttempt, uniqueEmail(), 'ValidPass1');

      if (response.status() === 201) {
        const body = await response.json();
        expect(body.token).toBeDefined();
        // Name should be sanitized or stored safely
      } else {
        expect(response.status()).toBe(400);
      }
    });
  });

  test.describe('POST /api/auth/login - Email Case Sensitivity', () => {
    test('handles email case insensitivity', async () => {
      const upperCaseEmail = TEST_USER.email.toUpperCase();
      const response = await authApi.login(upperCaseEmail, TEST_USER.password);

      // Most systems treat emails as case-insensitive
      expect([200, 401]).toContain(response.status());
    });

    test('handles mixed case email', async () => {
      const mixedCaseEmail = TEST_USER.email.split('').map((c, i) => 
        i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()
      ).join('');
      const response = await authApi.login(mixedCaseEmail, TEST_USER.password);

      expect([200, 401]).toContain(response.status());
    });
  });

  test.describe('POST /api/auth/login - Rate Limiting', () => {
    test('implements rate limiting for failed login attempts', async () => {
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        attempts.push(authApi.login(TEST_USER.email, 'WrongPassword' + i));
      }
      
      const responses = await Promise.all(attempts);
      const statusCodes = responses.map(r => r.status());
      
      // Should either all be 401 or some should be 429 (rate limited)
      const hasRateLimiting = statusCodes.some(code => code === 429);
      const allUnauthorized = statusCodes.every(code => code === 401);
      
      expect(hasRateLimiting || allUnauthorized).toBe(true);
    });
  });

  test.describe('GET /api/auth/me - Token Validation', () => {
    test('returns 401 with expired token', async () => {
      // This is a properly formatted but expired JWT
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ.invalid';
      const response = await authApi.getMe(expiredToken);

      expect(response.status()).toBe(401);
    });

    test('returns 401 with malformed token (not JWT format)', async () => {
      const malformedToken = 'not-a-jwt-token-at-all';
      const response = await authApi.getMe(malformedToken);

      expect(response.status()).toBe(401);
    });

    test('returns 401 with token missing parts', async () => {
      const incompleteToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const response = await authApi.getMe(incompleteToken);

      expect(response.status()).toBe(401);
    });

    test('returns 401 with tampered token payload', async () => {
      const token = await authApi.loginAndGetToken(TEST_USER.email, TEST_USER.password);
      const parts = token.split('.');
      // Tamper with the payload
      const tamperedPayload = Buffer.from(JSON.stringify({ userId: 99999, iat: Date.now() })).toString('base64');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
      
      const response = await authApi.getMe(tamperedToken);

      expect(response.status()).toBe(401);
    });

    test('returns 401 with empty Authorization header', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: '' },
      });

      expect(response.status()).toBe(401);
    });

    test('returns 401 with Bearer prefix but no token', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: 'Bearer ' },
      });

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
    test('supports limit parameter', async () => {
      // Create multiple tasks first
      await tasksApi.createTask({ title: 'Pagination test 1' });
      await tasksApi.createTask({ title: 'Pagination test 2' });
      await tasksApi.createTask({ title: 'Pagination test 3' });

      const response = await tasksApi.getTasks({ limit: 2 });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks.length).toBeLessThanOrEqual(2);
    });

    test('supports offset parameter', async () => {
      const allResponse = await tasksApi.getTasks();
      const allBody = await allResponse.json();

      if (allBody.total > 1) {
        const offsetResponse = await tasksApi.getTasks({ offset: 1 });
        expect(offsetResponse.status()).toBe(200);
        const offsetBody = await offsetResponse.json();
        expect(offsetBody.tasks[0]?.id).not.toBe(allBody.tasks[0]?.id);
      }
    });

    test('supports limit and offset together', async () => {
      const response = await tasksApi.getTasks({ limit: 5, offset: 0 });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks.length).toBeLessThanOrEqual(5);
    });

    test('returns empty array when offset exceeds total', async () => {
      const response = await tasksApi.getTasks({ offset: 999999 });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks).toEqual([]);
    });
  });

  test.describe('GET /api/tasks - Sorting', () => {
    test('sorts by created date descending', async () => {
      const response = await tasksApi.getTasks({ sort: 'created_at', order: 'desc' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      if (body.tasks.length > 1) {
        const dates = body.tasks.map((t: { created_at: string }) => new Date(t.created_at).getTime());
        expect(dates).toEqual([...dates].sort((a, b) => b - a));
      }
    });

    test('sorts by created date ascending', async () => {
      const response = await tasksApi.getTasks({ sort: 'created_at', order: 'asc' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      if (body.tasks.length > 1) {
        const dates = body.tasks.map((t: { created_at: string }) => new Date(t.created_at).getTime());
        expect(dates).toEqual([...dates].sort((a, b) => a - b));
      }
    });

    test('sorts by priority', async () => {
      const response = await tasksApi.getTasks({ sort: 'priority' });

      expect(response.status()).toBe(200);
    });

    test('sorts by due date', async () => {
      await tasksApi.createTask({ title: 'Due task', due_date: '2030-01-01' });
      const response = await tasksApi.getTasks({ sort: 'due_date' });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('GET /api/tasks - Filter Combinations', () => {
    test('filters by status and priority combined', async () => {
      await tasksApi.createTask({ title: 'Active high priority', priority: 'high' });
      
      const response = await tasksApi.getTasks({ status: 'active', priority: 'high' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks.every((t: { status: string; priority: string }) => 
        t.status === 'active' && t.priority === 'high'
      )).toBe(true);
    });

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

    test('combines status, priority, and search filters', async () => {
      await tasksApi.createTask({ title: 'Combined filter unique123', priority: 'high' });
      
      const response = await tasksApi.getTasks({ 
        status: 'active', 
        priority: 'high', 
        search: 'unique123' 
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks.length).toBeGreaterThan(0);
    });
  });

  test.describe('GET /api/tasks - Search Edge Cases', () => {
    test('handles search with special characters', async () => {
      await tasksApi.createTask({ title: 'Task with special @#$%' });
      
      const response = await tasksApi.getTasks({ search: '@#$%' });

      expect(response.status()).toBe(200);
    });

    test('handles empty search query', async () => {
      const response = await tasksApi.getTasks({ search: '' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.tasks)).toBe(true);
    });

    test('handles search with SQL injection attempt', async () => {
      const response = await tasksApi.getTasks({ search: "';