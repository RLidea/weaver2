'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import { Spinner } from '@/shared/components/ui/spinner';
import { usePermissionGroup } from '../hooks/use-permission-group';
import { useSetGroupPermissions } from '../hooks/use-permission-group-mutations';
import { PERMISSION_SECTIONS } from '../constants';
import type { PermissionGroup } from '../types';

interface Props {
  group: PermissionGroup | null;
  onClose: () => void;
}

export function PermissionGroupPermissionsModal({ group, onClose }: Props) {
  const { data: detail, isLoading } = usePermissionGroup(group?.id ?? null);
  const { mutate, isPending } = useSetGroupPermissions();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (detail) {
      setSelected(new Set(detail.permissions.map((p) => p.permission)));
    }
  }, [detail]);

  const toggle = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const isProtected = (value: string) =>
    group?.isSystem && group.name === 'SuperAdmin' && value === '*:*';

  const handleSave = () => {
    if (!group) return;
    mutate({ id: group.id, permissions: [...selected] }, { onSuccess: onClose });
  };

  return (
    <Modal open={!!group} onClose={onClose} title={`권한 편집 — ${group?.name ?? ''}`} size="lg">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            이 그룹에 부여할 권한을 선택하세요. 변경사항은 저장 즉시 적용됩니다.
          </p>

          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
            {PERMISSION_SECTIONS.map((section) => (
              <div key={section.key} className="rounded-md border border-border bg-surface-2 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {section.label}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {section.permissions.map((perm) => {
                    const locked = isProtected(perm.value);
                    return (
                      <label
                        key={perm.value}
                        className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-surface ${locked ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(perm.value)}
                          onChange={() => !locked && toggle(perm.value)}
                          disabled={locked}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="text-text">{perm.label}</span>
                        <code className="ml-auto text-[10px] text-text-muted">{perm.value}</code>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-sm text-text-muted">{selected.size}개 권한 선택됨</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                취소
              </Button>
              <Button onClick={handleSave} isLoading={isPending}>
                저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
