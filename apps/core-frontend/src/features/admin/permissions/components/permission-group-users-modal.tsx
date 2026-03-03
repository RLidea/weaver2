'use client';

import { useState } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Spinner } from '@/shared/components/ui/spinner';
import { useGroupUsers } from '../hooks/use-permission-group';
import {
  useAssignUsersToGroup,
  useRemoveUserFromGroup,
} from '../hooks/use-permission-group-mutations';
import { useAdminUsers } from '@/features/admin/users/hooks/use-admin-users';
import type { PermissionGroup } from '../types';

interface Props {
  group: PermissionGroup | null;
  onClose: () => void;
}

export function PermissionGroupUsersModal({ group, onClose }: Props) {
  const { data: groupUsers, isLoading } = useGroupUsers(group?.id ?? null);
  const { mutate: assign, isPending: isAssigning } = useAssignUsersToGroup();
  const { mutate: remove } = useRemoveUserFromGroup();

  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { data: searchResult } = useAdminUsers(
    showSearch && search.trim().length >= 2
      ? { search: search.trim(), limit: 10, status: 'active' }
      : undefined,
  );

  const groupUserIds = new Set(groupUsers?.map((u) => u.id) ?? []);

  const handleAssign = (userId: string) => {
    if (!group) return;
    assign(
      { groupId: group.id, userIds: [userId] },
      {
        onSuccess: () => {
          setSearch('');
        },
      },
    );
  };

  const handleRemove = (userId: string) => {
    if (!group) return;
    remove({ groupId: group.id, userId });
  };

  return (
    <Modal open={!!group} onClose={onClose} title={`소속 사용자 — ${group?.name ?? ''}`} size="md">
      <div className="space-y-4">
        {/* Current members */}
        <div className="rounded-md border border-border bg-surface-2">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              소속 사용자 ({groupUsers?.length ?? 0}명)
            </p>
            <Button size="sm" variant="ghost" onClick={() => setShowSearch((v) => !v)}>
              {showSearch ? '닫기' : '사용자 추가'}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="max-h-52 overflow-y-auto">
              {groupUsers?.length === 0 && (
                <p className="py-6 text-center text-sm text-text-muted">소속 사용자가 없습니다.</p>
              )}
              {groupUsers?.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-surface transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-text">{user.displayName}</p>
                    <p className="text-xs text-text-muted">@{user.username}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(user.id)}
                    className="text-error hover:text-error"
                  >
                    해제
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add users */}
        {showSearch && (
          <div className="space-y-2">
            <Input
              placeholder="사용자 이름 또는 이메일로 검색 (2자 이상)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {searchResult && searchResult.data.length > 0 && (
              <div className="rounded-md border border-border bg-surface-2 max-h-48 overflow-y-auto">
                {searchResult.data.map((user) => {
                  const alreadyIn = groupUserIds.has(user.id);
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-surface transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-text">{user.displayName}</p>
                        <p className="text-xs text-text-muted">@{user.username}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyIn ? 'secondary' : 'primary'}
                        disabled={alreadyIn || isAssigning}
                        onClick={() => handleAssign(user.id)}
                      >
                        {alreadyIn ? '이미 소속' : '추가'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            {searchResult && searchResult.data.length === 0 && search.trim().length >= 2 && (
              <p className="text-sm text-text-muted text-center py-3">검색 결과가 없습니다.</p>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </Modal>
  );
}
