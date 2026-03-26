import { APIRequestContext, APIResponse } from '@playwright/test';
import { API_URL } from '../fixtures/testData';

export class AuthApi {
  constructor(private request: APIRequestContext) {}

  async register(name: string, email: string, password: string): Promise<APIResponse> {
    return this.request.post(`${API_URL}/api/auth/register`, {
      data: { name, email, password },
    });
  }

  async login(email: string, password: string): Promise<APIResponse> {
    return this.request.post(`${API_URL}/api/auth/login`, {
      data: { email, password },
    });
  }

  async getMe(token: string): Promise<APIResponse> {
    return this.request.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async loginAndGetToken(email: string, password: string): Promise<string> {
    const response = await this.login(email, password);
    const body = await response.json();
    return body.token as string;
  }
}
