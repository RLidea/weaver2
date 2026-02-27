import { ApiError, ApiErrorResponse, ApiResponse } from '@/types/api';

type RequestOptions = Omit<RequestInit, 'body' | 'method'>;

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private onAuthError: (() => void) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * 인증 실패(refresh 불가) 시 호출할 콜백 등록.
   * AuthProvider에서 로그인 페이지로 redirect하는 함수를 주입한다.
   */
  setOnAuthError(callback: () => void) {
    this.onAuthError = callback;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
    isRetry = false,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return { message: 'success', data: undefined as T };
    }

    if (!response.ok) {
      if (response.status === 401 && !isRetry && !this.isRefreshing) {
        const refreshed = await this.refresh();
        if (refreshed) {
          return this.request<T>(method, path, body, options, true);
        }
        this.onAuthError?.();
        throw new ApiError(401, 'Unauthorized');
      }

      const errorBody = await response.json().catch(() => null) as ApiErrorResponse | null;
      const message = errorBody?.error?.message ?? 'Request failed';
      const errorPath = errorBody?.error?.path ?? path;
      const timestamp = errorBody?.error?.timestamp ?? new Date().toISOString();

      throw new ApiError(response.status, Array.isArray(message) ? message.join(', ') : message, errorPath, timestamp);
    }

    return response.json() as Promise<ApiResponse<T>>;
  }

  private async refresh(): Promise<boolean> {
    if (this.isRefreshing) return false;
    this.isRefreshing = true;
    try {
      const response = await fetch(`${this.baseUrl}/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body, options);
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body, options);
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, body, options);
  }

  delete<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, undefined, options);
  }
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl) {
  throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
}

export const apiClient = new ApiClient(apiUrl);

/**
 * ApiClient 싱글톤 반환.
 * 비동기 초기화가 필요한 미래 확장을 위해 async 인터페이스로 유지한다.
 */
export async function waitForApiClient(): Promise<ApiClient> {
  return apiClient;
}
