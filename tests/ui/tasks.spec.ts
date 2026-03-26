import { test, expect } from '@playwright/test';
import { TasksPage } from '../../src/pages/TasksPage';
import { TaskModal } from '../../src/pages/TaskModal';
import { loginViaApi } from '../../src/helpers/authHelper';
import { TasksApi } from '../../src/api/TasksApi';
import { NEW_TASK } from '../../src/fixtures/testData';

test.describe('Tasks CRUD', () => {
  let tasksPage: TasksPage;
  let taskModal: TaskModal;
  let tasksApi: TasksApi;

  test.beforeEach(async ({ page, request }) => {
    const token = await loginViaApi(page, request);
    tasksPage = new TasksPage(page);
    taskModal = new TaskModal(page);
    tasksApi = new TasksApi(request, token);
  });

  test('create task - modal opens, task saved and appears in list', async ({ page }) => {
    await tasksPage.clickAddTask();
    await expect(taskModal.modal).toBeVisible();

    await taskModal.fill(NEW_TASK.title, NEW_TASK.description, NEW_TASK.priority);
    await taskModal.save();

    await expect(taskModal.modal).not.toBeVisible();
    await expect(page.getByText(NEW_TASK.title)).toBeVisible();
  });

  test('create task - empty title shows validation error', async () => {
    await tasksPage.clickAddTask();
    await taskModal.save();

    await expect(taskModal.errorMessage).toBeVisible();
    await expect(taskModal.modal).toBeVisible();
  });

  test('create task - cancel closes modal without saving', async ({ page }) => {
    await tasksPage.clickAddTask();
    await taskModal.fill('Task that should not be saved');
    await taskModal.cancel();

    await expect(taskModal.modal).not.toBeVisible();
    await expect(page.getByText('Task that should not be saved')).not.toBeVisible();
  });

  test('edit task - updates title and description', async ({ page }) => {
    const taskId = await tasksApi.createTaskAndGetId({ title: 'Original title' });
    await page.reload();

    await tasksPage.editTaskButton(taskId).click();
    await expect(taskModal.modal).toBeVisible();
    await expect(taskModal.titleInput).toHaveValue('Original title');

    await taskModal.titleInput.clear();
    await taskModal.fill('Updated title', 'Updated description');
    await taskModal.save();

    await expect(taskModal.modal).not.toBeVisible();
    await expect(tasksPage.taskTitle(taskId)).toHaveText('Updated title');
    await expect(tasksPage.taskDescription(taskId)).toHaveText('Updated description');
  });

  test('delete task - confirm removes task from list', async ({ page }) => {
    const taskId = await tasksApi.createTaskAndGetId({ title: 'Task to delete' });
    await page.reload();

    await tasksPage.deleteTaskButton(taskId).click();
    await expect(tasksPage.confirmDeleteButton).toBeVisible();
    await tasksPage.confirmDeleteButton.click();

    await expect(tasksPage.taskCard(taskId)).not.toBeVisible();
  });

  test('delete task - cancel keeps task in list', async ({ page }) => {
    const taskId = await tasksApi.createTaskAndGetId({ title: 'Task to keep' });
    await page.reload();

    await tasksPage.deleteTaskButton(taskId).click();
    await expect(tasksPage.confirmDeleteButton).toBeVisible();
    await tasksPage.cancelDeleteButton.click();

    await expect(tasksPage.taskCard(taskId)).toBeVisible();
  });

  test('toggle task status - active becomes completed', async ({ page }) => {
    const taskId = await tasksApi.createTaskAndGetId({ title: 'Task to complete' });
    await page.reload();

    await expect(tasksPage.taskCheckbox(taskId)).not.toBeChecked();
    await tasksPage.taskCheckbox(taskId).click();

    await expect(tasksPage.taskCheckbox(taskId)).toBeChecked();
  });

  test('toggle task status - completed becomes active', async ({ page }) => {
    const taskId = await tasksApi.createTaskAndGetId({ title: 'Completed task' });
    await tasksApi.updateTask(taskId, { status: 'completed' });
    await page.reload();

    await expect(tasksPage.taskCheckbox(taskId)).toBeChecked();
    await tasksPage.taskCheckbox(taskId).click();

    await expect(tasksPage.taskCheckbox(taskId)).not.toBeChecked();
  });
});
