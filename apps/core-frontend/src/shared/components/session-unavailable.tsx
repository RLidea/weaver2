'use client';

import { Button } from '@weaver2/ui';

interface SessionUnavailableProps {
  /** React Query 의 refetch. 누르면 사용자 정보를 다시 물어본다. */
  onRetry: () => void;
  isRetrying?: boolean;
}

/**
 * 사용자 정보를 못 받아온 상태에서 그리는 화면.
 *
 * **여기서 로그인 페이지로 보내지 않는 것이 핵심이다.** 세션이 끝난 게 아니라 서버가
 * 잠깐 답을 못 준 것이므로, 로그인으로 보내면 쿠키가 멀쩡한 탓에 엣지 미들웨어가
 * 되돌려버리고 화면은 빈 채로 굳는다. 사람에게 무슨 일인지 알리고 다시 시도할
 * 손잡이를 주는 편이 옳다.
 */
export function SessionUnavailable({ onRetry, isRetrying }: SessionUnavailableProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <p className="text-lg font-medium text-text">
        사용자 정보를 불러오지 못했습니다.
      </p>
      <p className="text-sm text-text-muted">
        로그아웃된 것은 아닙니다. 잠시 후 다시 시도해주세요.
      </p>
      <Button variant="secondary" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? '다시 시도하는 중…' : '다시 시도'}
      </Button>
    </div>
  );
}
