'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { authApi } from '../api/auth.api';
import { authKeys } from '../query-keys';

/** sign-out 이 실패한 뒤 저절로는 다시 부르지 않는 시간 */
const AUTOMATIC_RETRY_COOLDOWN_MS = 30_000;
/** 떠난 화면에 이만큼 넘게 머물렀으면 이동이 막힌 것이다 — 그 뒤의 401 은 다시 떠나게 한다 */
const LEAVING_GRACE_MS = 5_000;

interface SignOutResult {
  cleared: boolean;
  /** sso 면 발급자의 로그아웃 주소 (D8) */
  endSessionUrl?: string;
}

// AuthProvider 와 레이아웃이 같은 순간에 부른다 — 진행 중인 sign-out 하나를 같이 쓴다
let inFlight: Promise<SignOutResult> | null = null;
// 실패는 누가 불렀든(버튼이든 401 이든) 센다 — 어느 쪽이든 지금 서버가 sign-out 을 못 받는다는 뜻이다
let lastFailedAt: number | null = null;
// 방금 세션을 내려놓고 떠나는 중인 화면. me 를 비우면 그 화면의 레이아웃이 「로그인 안 됨」을 보고
// automatic leave 를 또 부르는데, 그 sign-out 이 끝나 늦게 하는 replace(`/login?redirect=…`)가
// 먼저 간 곳(`/login`)을 덮어쓴다. 그 화면에 머무는 동안의 automatic 은 이미 떠난 것으로 본다
let leavingFrom: string | null = null;
let leftAt = 0;

function stillLeavingFrom(pathname: string): boolean {
  return leavingFrom === pathname && Date.now() - leftAt < LEAVING_GRACE_MS;
}

function signOutOnce(): Promise<SignOutResult> {
  inFlight ??= authApi
    .signOut()
    .then(
      (res) => {
        lastFailedAt = null;
        // http(s) 주소만 따른다 — 그 밖의 값(javascript: 등)으로 문서를 옮기지 않는다
        const url = res?.data?.endSessionUrl;
        return {
          cleared: true,
          endSessionUrl: url && /^https?:\/\//i.test(url) ? url : undefined,
        };
      },
      () => {
        lastFailedAt = Date.now();
        return { cleared: false };
      },
    )
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** 새로 로그인했다 — 앞 세션에서 실패·떠난 기록으로 새 세션의 401 을 건너뛰지 않게 지운다 */
export function forgetLeaveFailure() {
  lastFailedAt = null;
  leavingFrom = null;
}

function failedRecently(): boolean {
  return lastFailedAt !== null && Date.now() - lastFailedAt < AUTOMATIC_RETRY_COOLDOWN_MS;
}

interface LeaveOptions {
  /**
   * 사람이 누른 것이 아니라 401·화면 전환이 부른 것.
   * 막 실패했으면 다시 두드리지 않는다 — 401 은 요청마다 오므로, 그대로 두면 sign-out 이
   * 화면을 옮길 때마다 나가 스로틀에 걸린다. 「다시 시도」 버튼은 이 옵션 없이 부른다.
   */
  automatic?: boolean;
  /**
   * 사람이 누른 로그아웃. 서버가 발급자의 로그아웃 주소(`endSessionUrl`, AUTH_MODE=sso)를 주면
   * `href` 대신 그리로 **문서 이동**한다 — 이 앱의 세션은 이미 지워졌고, 발급자가 자기 세션을
   * 끝낼지 묻는다. 401 이 부른 자동 떠나기는 발급자로 보내지 않는다.
   */
  endSession?: boolean;
}

/**
 * 세션의 흔적(서버의 인증 쿠키·화면의 me 캐시)을 지운 뒤 로그인 화면으로 보낸다.
 *
 * 둘 중 하나라도 남은 채 `/login` 에 가면 되돌려진다 — 쿠키가 남으면 proxy 가, 「로그인됨」
 * me 캐시가 남으면 (auth) 레이아웃이 `/dashboard` 로 보내고, 화면은 그 사이에서 멈춘다.
 *
 * **쿠키를 못 지웠으면 보내지 않는다.** 보내 봐야 되돌려지고, 되돌아온 화면이 다시 지우러
 * 가며 서버를 두드리는 왕복이 된다. 대신 `failed` 를 세워 「다시 시도」 화면을 그리게 한다.
 * `leave` 는 보냈으면 true 를 돌려준다.
 */
export function useLeaveSession() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const [failed, setFailed] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const leave = useCallback(
    async (
      href: string,
      { automatic = false, endSession = false }: LeaveOptions = {},
    ): Promise<boolean> => {
      if (automatic && stillLeavingFrom(pathname)) return true;
      if (automatic && failedRecently()) {
        setFailed(true);
        return false;
      }
      setIsLeaving(true);
      const { cleared, endSessionUrl } = await signOutOnce();
      setIsLeaving(false);
      setFailed(!cleared);
      if (!cleared) return false;
      leavingFrom = pathname;
      leftAt = Date.now();
      queryClient.setQueryData(authKeys.me, null);
      if (endSession && endSessionUrl) {
        window.location.assign(endSessionUrl);
        return true;
      }
      router.replace(href);
      return true;
    },
    [queryClient, router, pathname],
  );

  // 화면을 옮겼으면 떠나는 중이 아니다 — AuthProvider 는 늘 붙어 있어 이동을 본다
  useEffect(() => {
    if (leavingFrom !== null && leavingFrom !== pathname) leavingFrom = null;
  }, [pathname]);

  return { leave, failed, isLeaving };
}
