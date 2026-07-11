'use client';

import { useEffect, useRef, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@weaver2/api-client';
import { useApiError } from '@/shared/hooks/use-api-error';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const { handleError } = useApiError();

  // ref로 최신 handler 보관 — useState init은 1회만 호출되므로
  // 캡쳐된 함수가 stale해지지 않도록 한 단계 우회.
  // 갱신은 커밋 후(effect), 읽기는 mutation 에러 시점(이벤트 타임)이라 렌더 중 ref 접근 없음
  const handlerRef = useRef(handleError);
  useEffect(() => {
    handlerRef.current = handleError;
  }, [handleError]);

  // 오탐: onMutationError는 mutation 에러 시점(이벤트 타임)에만 호출되고
  // createQueryClient는 콜백을 렌더 중 실행하지 않는다 — 정적 분석이 증명 못할 뿐
  // eslint-disable-next-line react-hooks/refs
  const [queryClient] = useState(() =>
    createQueryClient({
      onMutationError: (error) => handlerRef.current(error),
    }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
