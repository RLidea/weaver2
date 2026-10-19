/**
 * SSO(AUTH_MODE=sso) 로그인 화면의 순수 도우미 — 컴포넌트 밖에 두어 jest 로 잰다.
 */

/**
 * SSO 시작 주소. API 호출이 아니라 **문서 이동**이다 — 발급자 로그인 화면으로 갔다가 콜백이
 * 세션 쿠키를 주고 `next` 로 돌려보낸다. `next` 는 이미 같은 출처의 경로로 거른 값을 넘긴다
 * (서버도 한 번 더 거른다).
 */
export function ssoStartUrl({
  entry = 'admin',
  next,
  lang,
  apiBase = process.env.NEXT_PUBLIC_API_URL ?? '/api',
}: {
  entry?: string;
  next?: string;
  lang?: string;
  apiBase?: string;
}): string {
  const params = new URLSearchParams({ entry });
  if (next) params.set('next', next);
  if (lang) params.set('lang', lang);
  return `${apiBase.replace(/\/+$/, '')}/v1/auth/oidc/start?${params.toString()}`;
}

/** 콜백이 실패 주소에 싣는 `?error=` 값(D13) → 안내 문구. 모르는 값이면 null */
export function ssoErrorMessage(code: string | null): string | null {
  switch (code) {
    case 'sso_failed':
      return '로그인에 실패했습니다. 다시 시도해주세요.';
    case 'sso_cancelled':
      return '로그인을 취소했습니다.';
    case 'sso_unavailable':
      return '계정 서버에 닿지 못했습니다. 잠시 뒤 다시 시도해주세요.';
    case 'sso_busy':
      return '로그인 요청이 많습니다. 잠시 뒤 다시 시도해주세요.';
    case 'sso_email_unverified':
      return '계정 서버에서 이메일 인증을 마친 뒤 다시 로그인해주세요.';
    case 'sso_conflict':
      return '이 이메일로 된 계정이 이미 있습니다. 운영자에게 연결을 요청하세요.';
    case 'account_suspended':
      return '이용이 정지된 계정입니다.';
    case 'account_deleted':
      return '탈퇴한 계정입니다.';
    default:
      return null;
  }
}
