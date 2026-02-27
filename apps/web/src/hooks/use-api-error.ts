import { useCallback } from 'react';
import { useToast } from '@/context/toast-context';
import { ApiError } from '@/types/api';

const ERROR_MESSAGES: Partial<Record<number, string>> = {
  400: '요청이 올바르지 않습니다.',
  401: '인증이 필요합니다.',
  403: '접근 권한이 없습니다.',
  404: '요청한 리소스를 찾을 수 없습니다.',
  409: '이미 존재하는 데이터입니다.',
  429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  500: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

export function useApiError() {
  const toast = useToast();

  const handleError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError) {
        const message = ERROR_MESSAGES[error.status] ?? error.message;
        toast.error(message);
        return;
      }
      if (error instanceof Error) {
        toast.error(error.message);
        return;
      }
      toast.error('알 수 없는 오류가 발생했습니다.');
    },
    [toast],
  );

  return { handleError };
}
