'use client';

import { useState } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { useCreateBoard } from '../hooks/use-admin-board-mutations';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function BoardCreateModal({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { mutate, isPending } = useCreateBoard();

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutate(
      { name: name.trim(), description: description.trim() || undefined },
      { onSuccess: handleClose },
    );
  };

  return (
    <Modal open={open} onClose={handleClose} title="게시판 생성" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="게시판 이름"
          placeholder="예: 공지사항"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        <Input
          label="설명 (선택)"
          placeholder="게시판 설명을 입력하세요."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            취소
          </Button>
          <Button type="submit" disabled={!name.trim()} isLoading={isPending}>
            생성
          </Button>
        </div>
      </form>
    </Modal>
  );
}
