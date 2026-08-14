import { type NextRequest, NextResponse } from 'next/server';

/**
 * **공개 경로만 적고 나머지는 전부 보호한다.**
 *
 * 예전에는 보호할 경로를 나열했는데, 그러면 새 화면을 만들고 여기 적는 걸 잊는 순간
 * **비로그인으로 열린다.** 잊었을 때 열리는 쪽이 아니라 닫히는 쪽이어야 한다.
 *
 * 여기서 보는 것은 "로그인했는가" 하나뿐이다. 엣지 미들웨어는 쿠키만 볼 수 있고 서명
 * 검증 없이 토큰을 까서 권한을 읽는 것은 신뢰할 수 없다 — 권한 검사는 `(protected)` ·
 * `(admin)` 레이아웃과 서버 가드가 한다.
 *
 * 공개 화면을 새로 만들면 여기에 **명시적으로** 추가한다.
 */
const PUBLIC_PATHS = [
  '/', // 랜딩 — (public) 라우트 그룹
  '/login',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/auth/verify',
];

/** 로그인한 사용자가 들어오면 대시보드로 되돌릴 경로. */
const AUTH_PATHS = ['/login', '/sign-up'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) =>
    // 루트는 정확히 일치할 때만 — 접두어로 보면 모든 경로가 공개가 된다.
    p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(p + '/'),
  );
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token');
  const refreshToken = request.cookies.get('refresh_token');
  const hasSession = !!accessToken || !!refreshToken;

  if (!isPublic(pathname) && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage(pathname) && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)',
  ],
};
