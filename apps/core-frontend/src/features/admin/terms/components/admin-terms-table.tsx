'use client';

import { useState } from 'react';
import { Spinner } from '@/shared/components/ui/spinner';
import { Button } from '@/shared/components/ui/button';
import { useLatestTerms } from '@/core/terms/hooks/use-latest-terms';
import { AdminTermsCreateModal } from './admin-terms-create-modal';
import { AdminTermsEditModal } from './admin-terms-edit-modal';
import { AdminTermsDeleteDialog } from './admin-terms-delete-dialog';
import type { Terms } from '@/core/terms/types';

export function AdminTermsTable() {
  const { data, isLoading, isError } = useLatestTerms();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTerms, setEditTerms] = useState<Terms | null>(null);
  const [deleteTerms, setDeleteTerms] = useState<Terms | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>약관 등록</Button>
      </div>

      <div className="rounded-lg border border-border bg-surface">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {isError && (
          <p className="py-16 text-center text-sm text-error">데이터를 불러오는 데 실패했습니다.</p>
        )}

        {data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th className="px-4 py-3 font-medium">버전</th>
                  <th className="px-4 py-3 font-medium">제목</th>
                  <th className="px-4 py-3 font-medium">시행일</th>
                  <th className="px-4 py-3 font-medium">등록일</th>
                  <th className="px-4 py-3 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-muted">
                      등록된 약관이 없습니다.
                    </td>
                  </tr>
                )}
                {data.map((terms) => (
                  <tr key={terms.id} className="transition-colors hover:bg-surface-2">
                    <td className="px-4 py-3 text-text-muted">v{terms.version}</td>
                    <td className="px-4 py-3 font-medium text-text">{terms.title}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(terms.effectiveAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(terms.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditTerms(terms)}>
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTerms(terms)}
                          className="text-error hover:text-error"
                        >
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminTermsCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <AdminTermsEditModal terms={editTerms} onClose={() => setEditTerms(null)} />
      <AdminTermsDeleteDialog terms={deleteTerms} onClose={() => setDeleteTerms(null)} />
    </div>
  );
}
