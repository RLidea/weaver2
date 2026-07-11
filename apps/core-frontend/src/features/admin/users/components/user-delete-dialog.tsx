'use client';

import { useState } from 'react';
import { Button, Input, Modal } from '@weaver2/ui';
import { useDeleteAdminUser } from '../hooks/use-admin-user-mutations';
import type { AdminUser } from '../types';

interface UserDeleteDialogProps {
  user: AdminUser | null;
  onClose: () => void;
}

export function UserDeleteDialog({ user, onClose }: UserDeleteDialogProps) {
  const [confirm, setConfirm] = useState('');
  const { mutate, isPending } = useDeleteAdminUser();

  if (!user) return null;

  const handleDelete = () => {
    mutate(user.id, { onSuccess: () => { setConfirm(''); onClose(); } });
  };

  const isMatch = confirm === user.username;

  return (
    <Modal open={!!user} onClose={onClose} title="사용자 삭제" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-text">
          <span className="font-semibold text-error">{user.displayName}</span> 님을 삭제합니다.
          이 작업은 되돌릴 수 없습니다. 확인하려면 사용자명{' '}
          <span className="rounded bg-surface-2 px-1 font-mono text-text">{user.username}</span>을
          입력하세요.
        </p>
        <Input
          placeholder={user.username}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { setConfirm(''); onClose(); }}>취소</Button>
          <Button variant="danger" disabled={!isMatch} isLoading={isPending} onClick={handleDelete}>
            삭제
          </Button>
        </div>
      </div>
    </Modal>
  );
}
