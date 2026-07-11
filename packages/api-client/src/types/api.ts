/**
 * 백엔드 SuccessInterceptor가 감싸는 표준 성공 응답 형태
 * { message: string, data: T }
 */
export interface ApiResponse<T> {
  message: string;
  data: T;
}

/**
 * 백엔드 HttpExceptionFilter가 반환하는 표준 에러 응답 형태
 * { success: false, error: { code, message, path, timestamp } }
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: number;
    message: string | string[];
    path: string;
    timestamp: string;
  };
}

/**
 * ApiClient가 throw하는 에러 클래스
 */
export class ApiError extends Error {
  readonly status: number;
  readonly path: string;
  readonly timestamp: string;

  constructor(status: number, message: string, path = '', timestamp = new Date().toISOString()) {
    super(typeof message === 'string' ? message : JSON.stringify(message));
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
    this.timestamp = timestamp;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isConflict() {
    return this.status === 409;
  }

  get isValidationError() {
    return this.status === 400;
  }
}
