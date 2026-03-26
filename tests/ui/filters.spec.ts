import { test, expect } from '@playwright/test';
import { TasksPage } from '../../src/pages/TasksPage';
import { loginViaApi } from '../../src/helpers/authHelper';
import { TasksApi } from '../../src/api/TasksApi';

// Each test creates its own isolated tasks to stay independent of seed data.
test.describe('Filters and Search', () => {
  let tasksPage: TasksPage;
  let tasksApi: TasksApi;

  test.beforeEach(async ({ page, request }) => {
    const token = await loginViaApi(page, request);
    tasksPage = new TasksPage(page);
    tasksApi = new TasksApi(request, token);
  });

  test('filter by status: active shows only active tasks', async ({ page }) => {
    const activeId = await tasksApi.createTaskAndGetId({ title: 'Active filter task', priority: 'low' });
    const completedId = await tasksApi.createTaskAndGetId({ title: 'Completed filter task', priority: 'low' });
    await tasksApi.updateTask(completedId, { status: 'completed' });
    await page.reload();

    await tasksPage.filterActive.click();
    await expect(tasksPage.taskCard(activeId)).toBeVisible();
    await expect(tasksPage.taskCard(completedId)).not.toBeVisible();
  });

  test('filter by status: completed shows only completed tasks', async ({ page }) => {
    const activeId = await tasksApi.createTaskAndGetId({ title: 'Active only task', priority: 'low' });
    const completedId = await tasksApi.createTaskAndGetId({ title: 'Completed only task', priority: 'low' });
    await tasksApi.updateTask(completedId, { status: 'completed' });
    await page.reload();

    await tasksPage.filterCompleted.click();
    await expect(tasksPage.taskCard(completedId)).toBeVisible();
    await expect(tasksPage.taskCard(activeId)).not.toBeVisible();
  });

  test('filter all resets status filter', async ({ page }) => {
    const activeId = await tasksApi.createTaskAndGetId({ title: 'Active all test', priority: 'low' });
    const completedId = await tasksApi.createTaskAndGetId({ title: 'Completed all test', priority: 'low' });
    await tasksApi.updateTask(completedId, { status: 'completed' });
    await page.reload();

    await tasksPage.filterCompleted.click();
    await expect(tasksPage.taskCard(activeId)).not.toBeVisible();

    await tasksPage.filterAll.click();
    await expect(tasksPage.taskCard(activeId)).toBeVisible();
    await expect(tasksPage.taskCard(completedId)).toBeVisible();
  });

  test('filter by priority: high shows only high priority tasks', async ({ page }) => {
    const highId = await tasksApi.createTaskAndGetId({ title: 'High priority filter task', priority: 'high' });
    const lowId = await tasksApi.createTaskAndGetId({ title: 'Low priority filter task', priority: 'low' });
    await page.reload();

    await tasksPage.filterByPriority('high');
    await expect(tasksPage.taskCard(highId)).toBeVisible();
    await expect(tasksPage.taskCard(lowId)).not.toBeVisible();
  });

  test('filter by priority: low shows only low priority tasks', async ({ page }) => {
    const highId = await tasksApi.createTaskAndGetId({ title: 'High priority test task', priority: 'high' });
    const lowId = await tasksApi.createTaskAndGetId({ title: 'Low priority test task', priority: 'low' });
    await page.reload();

    await tasksPage.filterByPriority('low');
    await expect(tasksPage.taskCard(lowId)).toBeVisible();
    await expect(tasksPage.taskCard(highId)).not.toBeVisible();
  });

  test('search finds task by title', async ({ page }) => {
    const uniqueTitle = `Unique search task ${Date.now()}`;
    const taskId = await tasksApi.createTaskAndGetId({ title: uniqueTitle });
    const otherId = await tasksApi.createTaskAndGetId({ title: 'Other task not matching' });
    await page.reload();

    await tasksPage.search(uniqueTitle);

    await expect(tasksPage.taskCard(taskId)).toBeVisible();
    await expect(tasksPage.taskCard(otherId)).not.toBeVisible();
  });

  test('search with no results shows empty state', async ({ page }) => {
    await page.reload();

    await tasksPage.search('xyznonexistent12345');

    await expect(tasksPage.emptyState).toBeVisible();
  });

  test('search is case-insensitive', async ({ page }) => {
    const taskId = await tasksApi.createTaskAndGetId({ title: 'CaseSensitiveTask' });
    await page.reload();

    await tasksPage.search('casesensitivetask');
    await expect(tasksPage.taskCard(taskId)).toBeVisible();
  });
});
