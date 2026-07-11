import Link from 'next/link';
import { ExternalLinkIcon } from '@weaver2/ui';
import { SkinToggle } from './skin-toggle';
import { UserMenu } from './user-menu';

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-surface px-4">
      {/* 관리자 로고 */}
      <div className="flex items-center gap-2">
        <span className="text-base font-bold tracking-tight text-text">Weaver</span>
        <span className="rounded-sm bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-fg">
          Admin
        </span>
      </div>

      {/* 우측 영역 */}
      <div className="ml-auto flex items-center gap-1">
        {/* 사용자 앱으로 이동 */}
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ExternalLinkIcon className="h-4 w-4" />
          사용자 앱
        </Link>

        <SkinToggle />
        <UserMenu />
      </div>
    </header>
  );
}
