'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/cn';
import { Spinner } from '@/shared/components/ui/spinner';
import { BoardTable } from '@/features/admin/boards/components/board-table';
import { ContentPostsTab } from '@/features/admin/content/components/content-posts-tab';
import { ContentCommentsTab } from '@/features/admin/content/components/content-comments-tab';

type TabId = 'boards' | 'posts' | 'comments';

const TABS: { id: TabId; label: string }[] = [
  { id: 'boards', label: '게시판' },
  { id: 'posts', label: '게시글' },
  { id: 'comments', label: '댓글' },
];

function ContentTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = (searchParams.get('tab') as TabId) ?? 'boards';

  const setTab = (id: TabId) => {
    // 탭 전환 시 탭 외 파라미터(page, search 등) 초기화
    router.push(`${pathname}?tab=${id}`);
  };

  return (
    <div className="space-y-6">
      {/* 탭 헤더 */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === id
                ? 'border-b-2 border-primary text-primary'
                : 'text-text-muted hover:text-text',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        }
      >
        {activeTab === 'boards' && <BoardTable />}
        {activeTab === 'posts' && <ContentPostsTab />}
        {activeTab === 'comments' && <ContentCommentsTab />}
      </Suspense>
    </div>
  );
}

export default function AdminContentPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text">콘텐츠 관리</h1>
      <p className="mt-1 text-sm text-text-muted">
        게시판·게시글·댓글을 통합 관리합니다.
      </p>
      <div className="mt-6">
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          }
        >
          <ContentTabs />
        </Suspense>
      </div>
    </div>
  );
}
