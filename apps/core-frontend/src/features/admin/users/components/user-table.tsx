'use client';

import { useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Spinner } from '@/shared/components/ui/spinner';
import { Button } from '@/shared/components/ui/button';
import { Pagination } from '@/shared/components/ui/pagination';
import { useAdminUsers } from '../hooks/use-admin-users';
import { UserStatusBadge } from './user-status-badge';
import { UserDetailModal } from './user-detail-modal';
import { UserEditModal } from './user-edit-modal';
import { UserSuspendModal } from './user-suspend-modal';
import { UserDeleteDialog } from './user-delete-dialog';
import { UserTableFilters } from './user-table-filters';
import { getUserStatus, type AdminUser, type AdminUsersParams } from '../types';

export function UserTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params: AdminUsersParams = {
    page: Number(searchParams.get('page') ?? 1),
    limit: 20,
    search: searchParams.get('search') ?? undefined,
    status: (searchParams.get('status') as AdminUsersParams['status']) ?? 'all',
    sort: searchParams.get('sort') ?? 'createdAt:desc',
  };

  const { data, isLoading, isError } = useAdminUsers(params);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [suspendUser, setSuspendUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);

  const updateParams = (updates: Partial<AdminUsersParams>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === null) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    }
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="space-y-4">
      <UserTableFilters params={params} onChange={updateParams} />

      <div className="rounded-lg border border-border bg-surface">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {isError && (
          <p className="py-16 text-center text-sm text-error">데이터를 불러오는 데 실패했습니다.</p>
        )}

        {data && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-muted">
                    <th className="px-4 py-3 font-medium">사용자</th>
                    <th className="px-4 py-3 font-medium">이메일</th>
                    <th className="px-4 py-3 font-medium">권한 그룹</th>
                    <th className="px-4 py-3 font-medium">상태</th>
                    <th className="px-4 py-3 font-medium">가입일</th>
                    <th className="px-4 py-3 font-medium">마지막 로그인</th>
                    <th className="px-4 py-3 font-medium">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.data.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-text-muted">
                        사용자가 없습니다.
                      </td>
                    </tr>
                  )}
                  {data.data.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-text">
                            {user.profileImageUrl ? (
                              <img
                                src={user.profileImageUrl}
                                alt={user.displayName}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              user.displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-text">{user.displayName}</p>
                            <p className="text-xs text-text-muted">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{user.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        {user.permissionGroups.length > 0 ? (
                          <span className="text-text-muted">
                            {user.permissionGroups.map((g) => g.name).join(', ')}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <UserStatusBadge user={user} />
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString('ko-KR')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetailId(user.id)}
                            title="상세 보기"
                          >
                            보기
                          </Button>
                          {!user.deletedAt && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditUser(user)}
                                title="수정"
                              >
                                수정
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSuspendUser(user)}
                                title={getUserStatus(user) === 'suspended' ? '정지 해제' : '정지'}
                              >
                                {getUserStatus(user) === 'suspended' ? '해제' : '정지'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteUser(user)}
                                title="삭제"
                                className="text-error hover:text-error"
                              >
                                삭제
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border px-4 py-3">
              <Pagination
                currentPage={data.currentPage}
                lastPage={data.lastPage}
                total={data.total}
                limit={data.limit}
                onPageChange={(p) => updateParams({ page: p })}
              />
            </div>
          </>
        )}
      </div>

      <UserDetailModal userId={detailId} onClose={() => setDetailId(null)} />
      <UserEditModal user={editUser} onClose={() => setEditUser(null)} />
      <UserSuspendModal user={suspendUser} onClose={() => setSuspendUser(null)} />
      <UserDeleteDialog user={deleteUser} onClose={() => setDeleteUser(null)} />
    </div>
  );
}
