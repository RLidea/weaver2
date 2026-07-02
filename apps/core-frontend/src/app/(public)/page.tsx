// 서버 컴포넌트 (기본값)
// 'use client' 없이 async 함수로 선언하면 RSC로 동작
// 인터랙션이 필요한 부분은 별도 'use client' 컴포넌트로 분리
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-bg px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-text">Weaver</h1>
        <p className="mt-3 text-lg text-text-muted">범용 레코드-CRUD 보일러플레이트</p>
      </div>
      <div className="flex gap-3">
        <Link href="/login">
          <Button variant="primary" size="lg">로그인</Button>
        </Link>
        <Link href="/sign-up">
          <Button variant="secondary" size="lg">회원가입</Button>
        </Link>
      </div>
    </div>
  );
}

/**
 * RSC 패턴 가이드 (이 파일은 서버 컴포넌트)
 *
 * 서버에서 데이터를 fetch할 때:
 *   import { serverFetch } from '@/infrastructure/server-api';
 *   const data = await serverFetch<MyType>('/v1/endpoint');
 *
 * 인터랙션이 필요한 부분만 클라이언트 컴포넌트로 분리:
 *   // my-interactive-widget.tsx
 *   'use client';
 *   export function MyInteractiveWidget() { ... }
 *
 * 느린 데이터는 Suspense로 감싸 스트리밍:
 *   <Suspense fallback={<Skeleton />}>
 *     <SlowDataComponent />
 *   </Suspense>
 */
