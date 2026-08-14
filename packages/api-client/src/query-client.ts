import { MutationCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './types/api';

export interface CreateQueryClientOptions {
  /**
   * Called for any mutation error that did not opt out via
   * `meta: { skipGlobalErrorToast: true }`.
   */
  onMutationError?: (error: unknown) => void;
}

export function createQueryClient(options: CreateQueryClientOptions = {}) {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.skipGlobalErrorToast) return;
        // useMutation 옵션 단계에서 onError를 직접 정의한 경우는
        // 그 호출자가 책임지고 처리한다고 보고 글로벌 핸들러를 건너뛴다
        if (mutation.options.onError) return;
        options.onMutationError?.(error);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1분
        retry: (failureCount, error) => {
          // 다시 물어도 답이 달라지지 않는 응답은 재시도하지 않는다.
          // 404 도 그중 하나다 — 없는 것은 두 번 더 물어도 없고, 그 사이 사용자는
          // 아무 일도 일어나지 않는 스피너를 본다.
          if (
            error instanceof ApiError &&
            (error.isUnauthorized || error.isForbidden || error.isNotFound)
          ) {
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

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      skipGlobalErrorToast?: boolean;
    };
  }
}
