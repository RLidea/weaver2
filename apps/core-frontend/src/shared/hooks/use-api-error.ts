import { useCallback } from 'react';
import { useToast } from '@weaver2/ui';
import { getApiErrorMessage } from '@weaver2/api-client';

/**
 * API 에러 → 토스트 표시 글루 훅.
 * 상태코드별 메시지 매핑은 @weaver2/api-client의 getApiErrorMessage가 담당한다.
 */
export function useApiError() {
  const toast = useToast();

  const handleError = useCallback(
    (error: unknown) => {
      toast.error(getApiErrorMessage(error));
    },
    [toast],
  );

  return { handleError };
}
