'use client';

import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import { useDeletePermissionGroup } from '../hooks/use-permission-group-mutations';
import type { PermissionGroup } from '../types';

interface Props {
  group: PermissionGroup | null;
  onClose: () => void;
}

export function PermissionGroupDeleteDialog({ group, onClose }: Props) {
  const { mutate, isPending } = useDeletePermissionGroup();

  if (!group) return null;

  const handleDelete = () => {
    mutate(group.id, { onSuccess: onClose });
  };

  return (
    <Modal open={!!group} onClose={onClose} title="권한 그룹 삭제" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-text">
          <span className="font-semibold text-error">{group.name}</span> 그룹을 삭제합니다.
          {group._count.users > 0 ? (
            <span className="mt-1 block text-error">
              현재 {group._count.users}명의 사용자가 소속되어 있어 삭제할 수 없습니다. 먼저 사용자를 모두 해제하세요.
            </span>
          ) : (
            ' 이 작업은 되돌릴 수 없습니다.'
          )}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="danger"
            disabled={group._count.users > 0}
            isLoading={isPending}
            onClick={handleDelete}
          >
            삭제
          </Button>
        </div>
      </div>
    </Modal>
  );
}
