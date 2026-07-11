'use client';

import { useState } from 'react';
import { Button, Input, Modal } from '@weaver2/ui';
import { useCreatePermissionGroup } from '../hooks/use-permission-group-mutations';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PermissionGroupCreateModal({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { mutate, isPending } = useCreatePermissionGroup();

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
    <Modal open={open} onClose={handleClose} title="권한 그룹 생성" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="그룹 이름"
          placeholder="예: Editor"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          required
          autoFocus
        />
        <Input
          label="설명 (선택)"
          placeholder="이 그룹의 역할을 간단히 설명하세요."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
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
