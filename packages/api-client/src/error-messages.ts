import { ApiError } from './types/api';

const ERROR_MESSAGES: Partial<Record<number, string>> = {
  400: '요청이 올바르지 않습니다.',
  401: '인증이 필요합니다.',
  403: '접근 권한이 없습니다.',
  404: '요청한 리소스를 찾을 수 없습니다.',
  409: '이미 존재하는 데이터입니다.',
  429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  500: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

export const UNKNOWN_ERROR_MESSAGE = '알 수 없는 오류가 발생했습니다.';

/**
 * 에러를 사용자에게 보여줄 한국어 메시지로 변환한다.
 * 토스트 등 표시 수단은 앱 쪽 글루(use-api-error)가 책임진다.
 */
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.status] ?? error.message;
  }
  return UNKNOWN_ERROR_MESSAGE;
}
