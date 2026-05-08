'use client';

import { useRef, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/infrastructure/query-client';
import { useApiError } from '@/shared/hooks/use-api-error';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const { handleError } = useApiError();

  // ref로 최신 handler 보관 — useState init은 1회만 호출되므로
  // 여기서 캡쳐된 함수가 stale해지지 않도록 한 단계 우회
  const handlerRef = useRef(handleError);
  handlerRef.current = handleError;

  const [queryClient] = useState(() =>
    createQueryClient({
      onMutationError: (error) => handlerRef.current(error),
    }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
