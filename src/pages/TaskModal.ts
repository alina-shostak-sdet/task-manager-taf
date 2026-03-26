import { Page, Locator } from '@playwright/test';

export class TaskModal {
  readonly modal: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly prioritySelect: Locator;
  readonly dueDateInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly errorMessage: Locator;

  constructor(private page: Page) {
    this.modal = page.getByTestId('task-modal');
    this.titleInput = page.getByTestId('task-title-input');
    this.descriptionInput = page.getByTestId('task-description-input');
    this.prioritySelect = page.getByTestId('task-priority-select');
    this.dueDateInput = page.getByTestId('task-due-date-input');
    this.saveButton = page.getByTestId('save-task-button');
    this.cancelButton = page.getByTestId('cancel-task-button');
    this.errorMessage = page.getByTestId('modal-error-message');
  }

  async fill(title: string, description?: string, priority?: string) {
    await this.titleInput.fill(title);
    if (description !== undefined) await this.descriptionInput.fill(description);
    if (priority !== undefined) await this.prioritySelect.selectOption(priority);
  }

  async save() {
    await this.saveButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }
}
