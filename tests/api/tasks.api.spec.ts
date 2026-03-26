import { test, expect } from '@playwright/test';
import { AuthApi } from '../../src/api/AuthApi';
import { TasksApi } from '../../src/api/TasksApi';
import { TEST_USER, API_URL } from '../../src/fixtures/testData';

test.describe('Tasks API', () => {
  let tasksApi: TasksApi;
  let token: string;

  test.beforeEach(async ({ request }) => {
    const authApi = new AuthApi(request);
    token = await authApi.loginAndGetToken(TEST_USER.email, TEST_USER.password);
    tasksApi = new TasksApi(request, token);
  });

  test.describe('GET /api/tasks', () => {
    test('returns tasks list with total count', async () => {
      const response = await tasksApi.getTasks();

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.tasks)).toBe(true);
      expect(typeof body.total).toBe('number');
    });

    test('filters by status=active', async () => {
      const response = await tasksApi.getTasks({ status: 'active' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks.every((t: { status: string }) => t.status === 'active')).toBe(true);
    });

    test('filters by status=completed', async () => {
      const response = await tasksApi.getTasks({ status: 'completed' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks.every((t: { status: string }) => t.status === 'completed')).toBe(true);
    });

    test('filters by priority=high', async () => {
      const response = await tasksApi.getTasks({ priority: 'high' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks.every((t: { priority: string }) => t.priority === 'high')).toBe(true);
    });

    test('filters by search query', async () => {
      await tasksApi.createTask({ title: 'Unique search title xyz987' });
      const response = await tasksApi.getTasks({ search: 'xyz987' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tasks.length).toBeGreaterThan(0);
      expect(body.tasks.some((t: { title: string }) => t.title.includes('xyz987'))).toBe(true);
    });

    test('returns 401 without token', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/tasks`);

      expect(response.status()).toBe(401);
    });
  });

  test.describe('GET /api/tasks/:id', () => {
    test('returns task by id', async () => {
      const taskId = await tasksApi.createTaskAndGetId({ title: 'Task for GET by id' });
      const response = await tasksApi.getTask(taskId);

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.task.id).toBe(taskId);
      expect(body.task.title).toBe('Task for GET by id');
    });

    test('returns 404 for non-existent task', async () => {
      const response = await tasksApi.getTask(999999);

      expect(response.status()).toBe(404);
    });

    test('returns 403 when accessing another user task', async ({ request }) => {
      const authApi = new AuthApi(request);
      const user2Token = await authApi.loginAndGetToken('user2@test.com', 'Test1234!');
      const user2Api = new TasksApi(request, user2Token);
      const user2TaskId = await user2Api.createTaskAndGetId({ title: 'User2 private task' });

      const response = await tasksApi.getTask(user2TaskId);

      expect(response.status()).toBe(403);
    });
  });

  test.describe('POST /api/tasks', () => {
    test('creates task with required title', async () => {
      const response = await tasksApi.createTask({ title: 'New API task' });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.task.title).toBe('New API task');
      expect(body.task.id).toBeDefined();
      expect(body.task.status).toBe('active');
      expect(body.task.priority).toBe('medium');
    });

    test('creates task with all fields', async () => {
      const response = await tasksApi.createTask({
        title: 'Full task',
        description: 'Full description',
        priority: 'high',
        due_date: '2030-12-31',
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.task.title).toBe('Full task');
      expect(body.task.description).toBe('Full description');
      expect(body.task.priority).toBe('high');
      expect(body.task.due_date).toBe('2030-12-31');
    });

    test('returns 400 when title is missing', async () => {
      const response = await tasksApi.createTask({ title: '' });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'title' }),
        ]),
      );
    });

    test('returns 400 when title exceeds 100 characters', async () => {
      const response = await tasksApi.createTask({ title: 'A'.repeat(101) });

      expect(response.status()).toBe(400);
    });

    test('returns 400 when priority is invalid', async () => {
      const response = await tasksApi.createTask({
        title: 'Valid title',
        priority: 'urgent' as 'high',
      });

      expect(response.status()).toBe(400);
    });

    test('returns 400 when due_date format is invalid', async () => {
      const response = await tasksApi.createTask({
        title: 'Valid title',
        due_date: '31-12-2030',
      });

      expect(response.status()).toBe(400);
    });

    test('returns 401 without token', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/tasks`, {
        data: { title: 'Unauthorized task' },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('PUT /api/tasks/:id', () => {
    test('updates task title', async () => {
      const taskId = await tasksApi.createTaskAndGetId({ title: 'Original' });
      const response = await tasksApi.updateTask(taskId, { title: 'Updated title' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.task.title).toBe('Updated title');
    });

    test('updates task status to completed', async () => {
      const taskId = await tasksApi.createTaskAndGetId({ title: 'Active task' });
      const response = await tasksApi.updateTask(taskId, { status: 'completed' });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.task.status).toBe('completed');
    });

    test('returns 400 when title is empty string', async () => {
      const taskId = await tasksApi.createTaskAndGetId({ title: 'Will fail update' });
      const response = await tasksApi.updateTask(taskId, { title: '   ' });

      expect(response.status()).toBe(400);
    });

    test('returns 400 when status is invalid', async () => {
      const taskId = await tasksApi.createTaskAndGetId({ title: 'Task bad status' });
      const response = await tasksApi.updateTask(taskId, { status: 'pending' as 'active' });

      expect(response.status()).toBe(400);
    });

    test('returns 404 for non-existent task', async () => {
      const response = await tasksApi.updateTask(999999, { title: 'Ghost update' });

      expect(response.status()).toBe(404);
    });
  });

  test.describe('DELETE /api/tasks/:id', () => {
    test('deletes task and returns success message', async () => {
      const taskId = await tasksApi.createTaskAndGetId({ title: 'Task to delete' });
      const response = await tasksApi.deleteTask(taskId);

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Task deleted successfully');
    });

    test('task is no longer accessible after deletion', async () => {
      const taskId = await tasksApi.createTaskAndGetId({ title: 'Delete then get' });
      await tasksApi.deleteTask(taskId);

      const getResponse = await tasksApi.getTask(taskId);
      expect(getResponse.status()).toBe(404);
    });

    test('returns 404 for non-existent task', async () => {
      const response = await tasksApi.deleteTask(999999);

      expect(response.status()).toBe(404);
    });

    test('returns 401 without token', async ({ request }) => {
      const taskId = await tasksApi.createTaskAndGetId({ title: 'Protected task' });
      const response = await request.delete(`${API_URL}/api/tasks/${taskId}`);

      expect(response.status()).toBe(401);
    });
  });
});
