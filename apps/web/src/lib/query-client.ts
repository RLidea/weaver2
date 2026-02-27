import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/types/api';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1분
        retry: (failureCount, error) => {
          // 인증/권한 에러는 재시도 하지 않음
          if (error instanceof ApiError && (error.isUnauthorized || error.isForbidden)) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
