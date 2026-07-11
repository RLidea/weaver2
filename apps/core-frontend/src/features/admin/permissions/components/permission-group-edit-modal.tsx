'use client';

import { useState } from 'react';
import { Button, Input, Modal } from '@weaver2/ui';
import { useUpdatePermissionGroup } from '../hooks/use-permission-group-mutations';
import type { PermissionGroup } from '../types';

interface Props {
  group: PermissionGroup | null;
  onClose: () => void;
}

export function PermissionGroupEditModal({ group, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { mutate, isPending } = useUpdatePermissionGroup();

  // 대상 group이 바뀌면 폼 상태를 렌더 중에 재설정 (effect 내 동기 setState 회피)
  const [prevGroup, setPrevGroup] = useState<PermissionGroup | null>(null);
  if (group !== prevGroup) {
    setPrevGroup(group);
    if (group) {
      setName(group.name);
      setDescription(group.description ?? '');
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !name.trim()) return;
    mutate(
      { id: group.id, body: { name: name.trim(), description: description.trim() || undefined } },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal open={!!group} onClose={onClose} title="그룹 정보 수정" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="그룹 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          required
          disabled={group?.isSystem && group.name === 'SuperAdmin'}
          helperText={
            group?.isSystem && group.name === 'SuperAdmin'
              ? '시스템 그룹의 이름은 변경할 수 없습니다.'
              : undefined
          }
        />
        <Input
          label="설명 (선택)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
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
