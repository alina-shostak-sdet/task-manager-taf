import { APIRequestContext, APIResponse } from '@playwright/test';
import { API_URL } from '../fixtures/testData';

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'active' | 'completed';
  due_date?: string;
}

export interface TaskQueryParams {
  status?: string;
  priority?: string;
  search?: string;
}

export class TasksApi {
  private readonly headers: Record<string, string>;

  constructor(private request: APIRequestContext, token: string) {
    this.headers = { Authorization: `Bearer ${token}` };
  }

  async getTasks(params?: TaskQueryParams): Promise<APIResponse> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request.get(`${API_URL}/api/tasks${qs}`, { headers: this.headers });
  }

  async getTask(id: number): Promise<APIResponse> {
    return this.request.get(`${API_URL}/api/tasks/${id}`, { headers: this.headers });
  }

  async createTask(data: CreateTaskPayload): Promise<APIResponse> {
    return this.request.post(`${API_URL}/api/tasks`, {
      data,
      headers: this.headers,
    });
  }

  async updateTask(id: number, data: UpdateTaskPayload): Promise<APIResponse> {
    return this.request.put(`${API_URL}/api/tasks/${id}`, {
      data,
      headers: this.headers,
    });
  }

  async deleteTask(id: number): Promise<APIResponse> {
    return this.request.delete(`${API_URL}/api/tasks/${id}`, { headers: this.headers });
  }

  async createTaskAndGetId(data: CreateTaskPayload): Promise<number> {
    const response = await this.createTask(data);
    const body = await response.json();
    return body.task.id as number;
  }
}
