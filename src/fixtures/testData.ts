export const BASE_URL = 'http://localhost:5173';
export const API_URL = 'http://localhost:3000';

export const TEST_USER = {
  email: 'test@test.com',
  password: 'Test1234!',
  name: 'John Doe',
};

export const TEST_USER_2 = {
  email: 'user2@test.com',
  password: 'Test1234!',
  name: 'Jane Smith',
};

// Tasks seeded for TEST_USER (test@test.com)
// IDs depend on seed order: 1=Buy groceries, 2=Read a book, 3=Go to gym, 4=Fix bug in project, 5=Call dentist
export const SEEDED_TASKS = {
  buyGroceries: { title: 'Buy groceries', status: 'active', priority: 'high' },
  readBook: { title: 'Read a book', status: 'active', priority: 'low' },
  goToGym: { title: 'Go to gym', status: 'completed', priority: 'medium' },
  fixBug: { title: 'Fix bug in project', description: 'Critical bug on login page', status: 'active', priority: 'high' },
  callDentist: { title: 'Call dentist', status: 'active', priority: 'medium' },
} as const;

export const NEW_TASK = {
  title: 'Automation test task',
  description: 'Created by Playwright',
  priority: 'high' as const,
};

export const INVALID_CREDENTIALS = {
  email: 'nonexistent@test.com',
  password: 'WrongPass1!',
};

export function uniqueEmail(): string {
  return `test_${Date.now()}@test.com`;
}
