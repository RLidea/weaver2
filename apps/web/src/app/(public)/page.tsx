import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-bg px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-text">Weaver</h1>
        <p className="mt-3 text-lg text-text-muted">커뮤니티 플랫폼 보일러플레이트</p>
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
