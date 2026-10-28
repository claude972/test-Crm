import { Injectable } from '@nestjs/common';

@Injectable()
export class SecureHttpClientService {
  async get<T>(url: string, options?: any): Promise<T> {
    return {} as T;
  }
  async post<T>(url: string, data?: any, options?: any): Promise<T> {
    return {} as T;
  }
}
