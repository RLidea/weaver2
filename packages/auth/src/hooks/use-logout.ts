'use client';

import { useCallback } from 'react';
import { useLeaveSession } from './use-leave-session';

/**
 * 로그아웃 버튼. 쿠키를 지운 뒤에만 /login 으로 보낸다 (useLeaveSession).
 * AUTH_MODE=sso 면 /login 대신 서버가 준 발급자의 로그아웃 주소로 간다 — 공용 PC 에서 다음 사람이
 * 단추 한 번으로 앞사람 계정에 들어가지 않게(Q6).
 *
 * 실패해도 보내면 쿠키가 남아 proxy 가 /dashboard 로 되돌리고, 실패는 조용히 묻힌다.
 * `logout` 은 보냈으면 true — 아니면 부른 쪽이 알린다.
 */
export function useLogout() {
  const { leave, isLeaving } = useLeaveSession();
  const logout = useCallback(() => leave('/login', { endSession: true }), [leave]);

  return { logout, isPending: isLeaving };
}
