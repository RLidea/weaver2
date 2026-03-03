import { type NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = ['/dashboard', '/boards', '/notifications', '/settings'];
const AUTH_PATHS = ['/login', '/sign-up'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token');
  const refreshToken = request.cookies.get('refresh_token');
  const hasSession = !!accessToken || !!refreshToken;

  if (isProtected(pathname) && !hasSession) {
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
