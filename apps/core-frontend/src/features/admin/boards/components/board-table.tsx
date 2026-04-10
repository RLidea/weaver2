'use client';

import { useState } from 'react';
import { Spinner } from '@/shared/components/ui/spinner';
import { Button } from '@/shared/components/ui/button';
import { useAdminBoards } from '../hooks/use-admin-boards';
import { BoardCreateModal } from './board-create-modal';
import { BoardEditModal } from './board-edit-modal';
import { BoardPermissionsModal } from './board-permissions-modal';
import { BoardDeleteDialog } from './board-delete-dialog';
import type { AdminBoard } from '../types';

export function BoardTable() {
  const { data, isLoading, isError } = useAdminBoards();

  const [createOpen, setCreateOpen] = useState(false);
  const [editBoard, setEditBoard] = useState<AdminBoard | null>(null);
  const [permissionsBoard, setPermissionsBoard] = useState<AdminBoard | null>(null);
  const [deleteBoard, setDeleteBoard] = useState<AdminBoard | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>게시판 만들기</Button>
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
                  <th className="px-4 py-3 font-medium">게시판명</th>
                  <th className="px-4 py-3 font-medium">설명</th>
                  <th className="px-4 py-3 font-medium">게시글</th>
                  <th className="px-4 py-3 font-medium">댓글</th>
                  <th className="px-4 py-3 font-medium">최근 7일</th>
                  <th className="px-4 py-3 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      게시판이 없습니다.
                    </td>
                  </tr>
                )}
                {data.map((board) => (
                  <tr key={board.id} className="transition-colors hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <a
                        href={`/boards/${board.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-text hover:text-primary hover:underline"
                      >
                        {board.name}
                      </a>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-text-muted">
                      {board.description ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{board.stats.totalPosts}</td>
                    <td className="px-4 py-3 text-text-muted">{board.stats.totalComments}</td>
                    <td className="px-4 py-3 text-text-muted">{board.stats.recentPosts}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPermissionsBoard(board)}
                        >
                          권한
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditBoard(board)}>
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteBoard(board)}
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

      <BoardCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <BoardEditModal board={editBoard} onClose={() => setEditBoard(null)} />
      <BoardPermissionsModal board={permissionsBoard} onClose={() => setPermissionsBoard(null)} />
      <BoardDeleteDialog board={deleteBoard} onClose={() => setDeleteBoard(null)} />
    </div>
  );
}
