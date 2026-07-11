'use client';

import { Button, Modal } from '@weaver2/ui';
import { useDeleteBoard } from '../hooks/use-admin-board-mutations';
import type { AdminBoard } from '../types';

interface Props {
  board: AdminBoard | null;
  onClose: () => void;
}

export function BoardDeleteDialog({ board, onClose }: Props) {
  const { mutate, isPending } = useDeleteBoard();

  if (!board) return null;

  const handleDelete = () => {
    mutate(board.id, { onSuccess: onClose });
  };

  return (
    <Modal open={!!board} onClose={onClose} title="게시판 삭제" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-text">
          <span className="font-semibold text-error">{board.name}</span> 게시판을 삭제합니다.
          게시판과 모든 게시글/댓글이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button variant="danger" isLoading={isPending} onClick={handleDelete}>
            삭제
          </Button>
        </div>
      </div>
    </Modal>
  );
}
