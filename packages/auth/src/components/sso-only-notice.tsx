'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, Spinner } from '@weaver2/ui';
import { useAuthProviders } from '../hooks/use-auth-providers';

/**
 * 로컬 계정 화면(가입 · 비밀번호 찾기 등)을 감싼다. AUTH_MODE=sso 면 그 화면 대신 안내와
 * 로그인 단추만 그린다 — 그 경로는 서버에서 404 로 닫혀 있다. 화면 파일은 지우지 않는다
 * (되돌리기 길).
 */
export function SsoOnlyNotice({
  title,
  children,
}: {
  /** 닫힌 화면의 이름 — 「회원가입」 같은 */
  title: string;
  children: ReactNode;
}) {
  const { isSso, isLoading } = useAuthProviders();
  if (isLoading) return <Spinner size="md" />;
  if (!isSso) return <>{children}</>;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <h1 className="text-center text-2xl font-semibold text-text">{title}</h1>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-muted">
          계정은 통합 계정 서버에서 만들고 관리합니다. 로그인 화면의 「SSO 로 로그인」을 눌러
          주세요.
        </p>
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/login" className="text-sm font-medium text-primary hover:opacity-80">
          로그인 화면으로
        </Link>
      </CardFooter>
    </Card>
  );
}
