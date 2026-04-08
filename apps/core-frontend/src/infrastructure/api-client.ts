import { ApiError, ApiErrorResponse, ApiResponse } from '@/types/api';

type RequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  /** true이면 401 후 refresh 실패 시 onAuthError를 호출하지 않는다. */
  skipOnAuthError?: boolean;
};

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshQueue: ((success: boolean) => void)[] = [];
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

    // skipOnAuthError는 fetch 옵션이 아니므로 분리
    const { skipOnAuthError, ...fetchOptions } = options ?? {};

    const csrfHeaders: Record<string, string> = {};
    if (MUTATION_METHODS.has(method)) {
      csrfHeaders['x-csrf-token'] = await this.ensureCsrfToken();
    }

    const isFormData = body instanceof FormData;
    const response = await fetch(url, {
      ...fetchOptions,
      method,
      credentials: 'include',
      headers: {
        // FormData는 브라우저가 Content-Type + boundary를 자동으로 설정
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...fetchOptions.headers,
        ...csrfHeaders,
      },
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
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
      // skipOnAuthError=true여도 세션이 살아있을 수 있으므로(리프레시 토큰 존재 가능성) 우선 리프레시를 시도한다.
      if (response.status === 401 && !isRetry) {
        if (this.isRefreshing) {
          console.log(`[ApiClient] Refresh in progress, queueing request: ${path}`);
          const refreshed = await new Promise<boolean>((resolve) => {
            this.refreshQueue.push(resolve);
          });

          if (refreshed) {
            console.log(`[ApiClient] Retrying queued request after successful refresh: ${path}`);
            return this.request<T>(method, path, body, options, true);
          }
          throw new ApiError(401, 'Unauthorized (Refresh failed)');
        }

        console.log(`[ApiClient] 401 detected, starting token refresh: ${path} (skipOnAuthError=${!!skipOnAuthError})`);
        const refreshed = await this.refresh();

        if (refreshed) {
          console.log(`[ApiClient] Token refreshed successfully, retrying: ${path}`);
          return this.request<T>(method, path, body, options, true);
        }

        console.warn(`[ApiClient] Token refresh failed for: ${path}`);

        // 리프레시 실패 시 skipOnAuthError가 false인 경우에만 로그인 페이지로 리다이렉트
        if (!skipOnAuthError) {
          this.onAuthError?.();
        }

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

    return response.json().catch(() => {
      throw new ApiError(response.status, '응답을 처리할 수 없습니다.');
    }) as Promise<ApiResponse<T>>;
  }

  private async refresh(): Promise<boolean> {
    if (this.isRefreshing) return false;
    this.isRefreshing = true;
    console.log('[ApiClient] Executing refresh POST request...');

    try {
      const csrfToken = await this.ensureCsrfToken();
      const response = await fetch(`${this.baseUrl}/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'x-csrf-token': csrfToken,
        },
      });

      const success = response.ok;
      if (!success) {
        if (response.status === 401) {
          console.warn(`[ApiClient] Session expired (401 during refresh)`);
        } else {
          console.error(`[ApiClient] Refresh endpoint returned error: ${response.status}`);
        }
        this.csrfToken = null;
      } else {
        console.log('[ApiClient] Refresh endpoint succeeded');
      }

      // 큐에 대기 중인 모든 요청에 결과 전달
      this.processQueue(success);
      return success;
    } catch (error) {
      console.error('[ApiClient] Error during refresh process:', error);
      this.processQueue(false);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  private processQueue(success: boolean) {
    if (this.refreshQueue.length > 0) {
      console.log(`[ApiClient] Processing ${this.refreshQueue.length} queued requests with success=${success}`);
      this.refreshQueue.forEach((resolve) => resolve(success));
      this.refreshQueue = [];
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

  deleteWithBody<T>(path: string, body: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, body, options);
  }

  postForm<T>(path: string, body: FormData, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body, options);
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
