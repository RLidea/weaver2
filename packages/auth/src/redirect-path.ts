/**
 * 로그인 뒤 갈 곳. 같은 출처의 경로만 받는다 — `?redirect=https://…`·`//…` 를 그대로 넘기면
 * 로그인 화면이 남의 사이트로 보내는 오픈 리다이렉트가 된다.
 * 접두어 검사가 아니라 **URL 로 파싱해 출처를 비교**한다. URL 파서는 탭·줄바꿈을 지우므로
 * `/\t/evil.com` 같은 값은 문자열로는 경로처럼 보여도 실제로는 `//evil.com` 이 된다.
 * 출처가 같아도 **점 마디를 푼 결과**가 `//evil.com` 일 수 있다(`/.//evil.com` · `/a/..//evil.com`) —
 * 그 값은 프로토콜 상대 주소라 다른 사이트다. 풀린 결과가 `//` · `/\` 로 시작하면 버린다.
 */
export function safeRedirectPath(value: string | null, fallback = '/dashboard'): string {
  if (!value) return fallback;
  const base = 'http://same-origin.invalid';
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    const out = `${url.pathname}${url.search}${url.hash}`;
    return out.startsWith('/') && !out.startsWith('//') && !out.startsWith('/\\')
      ? out
      : fallback;
  } catch {
    return fallback;
  }
}
