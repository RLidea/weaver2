import { Suspense } from 'react';
import { Spinner } from '@/shared/components/ui/spinner';
import { BoardTable } from '@/features/admin/boards/components/board-table';

export default function AdminBoardsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text">게시판 관리</h1>
      <p className="mt-1 text-sm text-text-muted">게시판을 생성하고 접근 권한을 설정하세요.</p>
      <div className="mt-6">
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          }
        >
          <BoardTable />
        </Suspense>
      </div>
    </div>
  );
}
