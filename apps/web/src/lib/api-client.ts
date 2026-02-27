import { ApiError, ApiErrorResponse, ApiResponse } from '@/types/api';

type RequestOptions = Omit<RequestInit, 'body' | 'method'>;

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private onAuthError: (() => void) | null = null;
  private csrfToken: string | null = null;

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

  /**
   * CSRF 토큰이 캐시되어 있으면 반환, 없으면 서버에서 발급받는다.
   * GET 요청이므로 CSRF 검사 대상이 아니다.
   */
  private async ensureCsrfToken(): Promise<string> {
    if (this.csrfToken) return this.csrfToken;

    const response = await fetch(`${this.baseUrl}/v1/auth/csrf-token`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to fetch CSRF token');
    }

    const data = (await response.json()) as ApiResponse<{ csrfToken: string }>;
    this.csrfToken = data.data.csrfToken;
    return this.csrfToken;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
    isRetry = false,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;

    const csrfHeaders: Record<string, string> = {};
    if (MUTATION_METHODS.has(method)) {
      csrfHeaders['x-csrf-token'] = await this.ensureCsrfToken();
    }

    const response = await fetch(url, {
      ...options,
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
        ...csrfHeaders,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return { message: 'success', data: undefined as T };
    }

    if (!response.ok) {
      // CSRF 토큰 만료 → 캐시 무효화 후 1회 재시도
      if (response.status === 403 && !isRetry) {
        this.csrfToken = null;
        return this.request<T>(method, path, body, options, true);
      }

      // 액세스 토큰 만료 → refresh 후 1회 재시도
      if (response.status === 401 && !isRetry && !this.isRefreshing) {
        const refreshed = await this.refresh();
        if (refreshed) {
          return this.request<T>(method, path, body, options, true);
        }
        this.onAuthError?.();
        throw new ApiError(401, 'Unauthorized');
      }

      const errorBody = (await response.json().catch(() => null)) as ApiErrorResponse | null;
      const message = errorBody?.error?.message ?? 'Request failed';
      const errorPath = errorBody?.error?.path ?? path;
      const timestamp = errorBody?.error?.timestamp ?? new Date().toISOString();

      throw new ApiError(
        response.status,
        Array.isArray(message) ? message.join(', ') : message,
        errorPath,
        timestamp,
      );
    }

    return response.json() as Promise<ApiResponse<T>>;
  }

  private async refresh(): Promise<boolean> {
    if (this.isRefreshing) return false;
    this.isRefreshing = true;
    try {
      const csrfToken = await this.ensureCsrfToken();
      const response = await fetch(`${this.baseUrl}/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'x-csrf-token': csrfToken,
        },
      });
      // refresh 실패 시 CSRF 토큰도 함께 무효화
      if (!response.ok) {
        this.csrfToken = null;
      }
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
