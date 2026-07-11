'use client';

import type { ReactNode } from 'react';
import { hasPermission } from '@weaver2/shared';
import { useMe } from '@/core/user/hooks/use-me';
import { Spinner } from '@weaver2/ui';

interface Props {
  /** 단일 권한 또는 OR 평가 권한 배열 */
  permission: string | string[];
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * 페이지·섹션 단위 권한 가드.
 *
 * `(admin)` layout이 ADMIN.ACCESS만 검사하므로, 하위 페이지·액션 단위는
 * 이 컴포넌트로 명시 권한을 추가 검사한다.
 */
export function RequirePermission({ permission, fallback, children }: Props) {
  const { user, isLoading } = useMe();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const required = Array.isArray(permission) ? permission : [permission];
  const ok =
    !!user &&
    required.some((p) => hasPermission(user.permissions ?? [], p));

  if (!ok) {
    return (
      <>
        {fallback ?? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            <p className="text-sm font-semibold text-text">접근 권한이 없습니다.</p>
            <p className="mt-1 text-xs text-text-muted">
              이 페이지에 접근하려면 추가 권한이 필요합니다. 관리자에게 문의해주세요.
            </p>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
