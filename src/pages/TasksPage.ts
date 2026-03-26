import { Page, Locator } from '@playwright/test';

export class TasksPage {
  readonly taskList: Locator;
  readonly addTaskButton: Locator;
  readonly filterAll: Locator;
  readonly filterActive: Locator;
  readonly filterCompleted: Locator;
  readonly priorityFilter: Locator;
  readonly searchInput: Locator;
  readonly taskCount: Locator;
  readonly emptyState: Locator;

  constructor(private page: Page) {
    this.taskList = page.getByTestId('task-list');
    this.addTaskButton = page.getByTestId('add-task-button');
    this.filterAll = page.getByTestId('filter-all');
    this.filterActive = page.getByTestId('filter-active');
    this.filterCompleted = page.getByTestId('filter-completed');
    this.priorityFilter = page.getByTestId('priority-filter');
    this.searchInput = page.getByTestId('search-input');
    this.taskCount = page.getByTestId('task-count');
    this.emptyState = page.getByTestId('empty-state');
  }

  async goto() {
    await this.page.goto('/tasks');
  }

  taskCard(id: number): Locator {
    return this.page.getByTestId(`task-card-${id}`);
  }

  taskTitle(id: number): Locator {
    return this.page.getByTestId(`task-title-${id}`);
  }

  taskDescription(id: number): Locator {
    return this.page.getByTestId(`task-description-${id}`);
  }

  taskPriority(id: number): Locator {
    return this.page.getByTestId(`task-priority-${id}`);
  }

  taskDueDate(id: number): Locator {
    return this.page.getByTestId(`task-due-date-${id}`);
  }

  taskCheckbox(id: number): Locator {
    return this.page.getByTestId(`task-checkbox-${id}`);
  }

  editTaskButton(id: number): Locator {
    return this.page.getByTestId(`edit-task-button-${id}`);
  }

  deleteTaskButton(id: number): Locator {
    return this.page.getByTestId(`delete-task-button-${id}`);
  }

  get confirmDeleteButton(): Locator {
    return this.page.getByTestId('confirm-delete-button');
  }

  get cancelDeleteButton(): Locator {
    return this.page.getByTestId('cancel-delete-button');
  }

  async clickAddTask() {
    await this.addTaskButton.click();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  async filterByPriority(priority: string) {
    await this.priorityFilter.selectOption(priority);
  }
}
