'use client';

import { useState } from 'react';
import { Badge, Button, Spinner } from '@weaver2/ui';
import { usePermissionGroups } from '../hooks/use-permission-groups';
import { PermissionGroupCreateModal } from './permission-group-create-modal';
import { PermissionGroupEditModal } from './permission-group-edit-modal';
import { PermissionGroupPermissionsModal } from './permission-group-permissions-modal';
import { PermissionGroupUsersModal } from './permission-group-users-modal';
import { PermissionGroupDeleteDialog } from './permission-group-delete-dialog';
import type { PermissionGroup } from '../types';

export function PermissionGroupTable() {
  const { data, isLoading, isError } = usePermissionGroups();

  const [createOpen, setCreateOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<PermissionGroup | null>(null);
  const [permissionsGroup, setPermissionsGroup] = useState<PermissionGroup | null>(null);
  const [usersGroup, setUsersGroup] = useState<PermissionGroup | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<PermissionGroup | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>그룹 만들기</Button>
      </div>

      <div className="rounded-lg border border-border bg-surface">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {isError && (
          <p className="py-16 text-center text-sm text-error">
            데이터를 불러오는 데 실패했습니다.
          </p>
        )}

        {data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th className="px-4 py-3 font-medium">그룹명</th>
                  <th className="px-4 py-3 font-medium">설명</th>
                  <th className="px-4 py-3 font-medium">권한 수</th>
                  <th className="px-4 py-3 font-medium">사용자 수</th>
                  <th className="px-4 py-3 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-muted">
                      권한 그룹이 없습니다.
                    </td>
                  </tr>
                )}
                {data.map((group) => (
                  <tr key={group.id} className="transition-colors hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text">{group.name}</span>
                        {group.isSystem && (
                          <Badge variant="default" size="sm">
                            시스템
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-text-muted">
                      {group.description ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{group._count.permissions}</td>
                    <td className="px-4 py-3 text-text-muted">{group._count.users}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPermissionsGroup(group)}
                        >
                          권한
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setUsersGroup(group)}>
                          사용자
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditGroup(group)}>
                          수정
                        </Button>
                        {!group.isSystem && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteGroup(group)}
                            className="text-error hover:text-error"
                          >
                            삭제
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PermissionGroupCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <PermissionGroupEditModal group={editGroup} onClose={() => setEditGroup(null)} />
      <PermissionGroupPermissionsModal
        group={permissionsGroup}
        onClose={() => setPermissionsGroup(null)}
      />
      <PermissionGroupUsersModal group={usersGroup} onClose={() => setUsersGroup(null)} />
      <PermissionGroupDeleteDialog group={deleteGroup} onClose={() => setDeleteGroup(null)} />
    </div>
  );
}
