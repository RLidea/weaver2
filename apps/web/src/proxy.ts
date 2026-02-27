import { NextResponse } from 'next/server';

export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 아래 경로를 제외한 모든 요청에 proxy 적용:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico
     * - /api (백엔드 프록시 경로)
     * - public 폴더 파일 (.png, .svg 등)
     *
     * 인증 보호는 각 Route Group의 layout.tsx에서 처리
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)',
  ],
};
