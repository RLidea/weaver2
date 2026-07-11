'use client';

import { useState } from 'react';
import { Button, Modal, Spinner } from '@weaver2/ui';
import { useBoardPermissions } from '../hooks/use-admin-boards';
import { useUpdateBoardPermissions } from '../hooks/use-admin-board-mutations';
import { usePermissionGroups } from '@/features/admin/permissions/hooks/use-permission-groups';
import { BOARD_ACTIONS, type AdminBoard, type UpdateBoardPermissionsRequest } from '../types';

interface Props {
  board: AdminBoard | null;
  onClose: () => void;
}

export function BoardPermissionsModal({ board, onClose }: Props) {
  const { data: perms, isLoading } = useBoardPermissions(board?.id ?? null);
  const { data: groups } = usePermissionGroups();
  const { mutate, isPending } = useUpdateBoardPermissions();

  // local state: { [action]: { allowAnonymous, allowedGroupNames } }
  const [draft, setDraft] = useState<Record<string, { allowAnonymous: boolean; allowedGroupNames: string[] }>>({});

  // 서버 권한 데이터가 바뀌면 draft를 렌더 중에 재구성 (effect 내 동기 setState 회피)
  const [prevPerms, setPrevPerms] = useState<typeof perms>(undefined);
  if (perms !== prevPerms) {
    setPrevPerms(perms);
    if (perms) {
      const initial: typeof draft = {};
      for (const action of BOARD_ACTIONS) {
        const existing = perms.find((p) => p.action === action.value);
        initial[action.value] = {
          allowAnonymous: existing?.allowAnonymous ?? false,
          allowedGroupNames: existing?.allowedGroupNames ?? [],
        };
      }
      setDraft(initial);
    }
  }

  const toggleAnonymous = (action: string) => {
    setDraft((prev) => ({
      ...prev,
      [action]: { ...prev[action], allowAnonymous: !prev[action]?.allowAnonymous },
    }));
  };

  const toggleGroup = (action: string, groupName: string) => {
    setDraft((prev) => {
      const current = prev[action]?.allowedGroupNames ?? [];
      const next = current.includes(groupName)
        ? current.filter((g) => g !== groupName)
        : [...current, groupName];
      return { ...prev, [action]: { ...prev[action], allowedGroupNames: next } };
    });
  };

  const handleSave = () => {
    if (!board) return;
    const permissions: UpdateBoardPermissionsRequest[] = BOARD_ACTIONS.map(({ value }) => ({
      action: value,
      allowAnonymous: draft[value]?.allowAnonymous ?? false,
      allowedGroupNames: draft[value]?.allowedGroupNames ?? [],
    }));
    mutate({ boardId: board.id, permissions }, { onSuccess: onClose });
  };

  return (
    <Modal
      open={!!board}
      onClose={onClose}
      title={`접근 권한 — ${board?.name ?? ''}`}
      size="lg"
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            각 액션별로 익명 허용 여부와 허용할 권한 그룹을 설정하세요.
          </p>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted bg-surface-2">
                  <th className="px-3 py-2 font-medium">액션</th>
                  <th className="px-3 py-2 font-medium">익명 허용</th>
                  <th className="px-3 py-2 font-medium">허용 그룹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {BOARD_ACTIONS.map(({ value, label }) => (
                  <tr key={value} className="hover:bg-surface-2 transition-colors">
                    <td className="px-3 py-2 font-medium text-text">{label}</td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={draft[value]?.allowAnonymous ?? false}
                        onChange={() => toggleAnonymous(value)}
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {groups?.map((group) => {
                          const checked = draft[value]?.allowedGroupNames?.includes(group.name) ?? false;
                          return (
                            <label
                              key={group.id}
                              className={`inline-flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors ${
                                checked
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-surface-2 text-text-muted hover:bg-surface'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleGroup(value, group.name)}
                                className="sr-only"
                              />
                              {group.name}
                            </label>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button onClick={handleSave} isLoading={isPending}>
              저장
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
