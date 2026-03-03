import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-text-muted">404</h1>
      <p className="text-lg text-text-muted">페이지를 찾을 수 없습니다.</p>
      <Link href="/" className="text-sm text-primary underline underline-offset-4 hover:opacity-80">
        홈으로 돌아가기
      </Link>
    </div>
  );
}
