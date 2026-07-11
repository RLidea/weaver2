'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Modal } from '@weaver2/ui';
import { useUpdateBoard } from '../hooks/use-admin-board-mutations';
import type { AdminBoard } from '../types';

interface Props {
  board: AdminBoard | null;
  onClose: () => void;
}

export function BoardEditModal({ board, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { mutate, isPending } = useUpdateBoard();

  useEffect(() => {
    if (board) {
      setName(board.name);
      setDescription(board.description ?? '');
    }
  }, [board]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!board || !name.trim()) return;
    mutate(
      { id: board.id, body: { name: name.trim(), description: description.trim() || undefined } },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal open={!!board} onClose={onClose} title="게시판 수정" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="게시판 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="설명 (선택)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={!name.trim()} isLoading={isPending}>
            저장
          </Button>
        </div>
      </form>
    </Modal>
  );
}
