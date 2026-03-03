'use client';

import { Modal } from '@/shared/components/ui/modal';
import { Spinner } from '@/shared/components/ui/spinner';
import { Badge } from '@/shared/components/ui/badge';
import { useAdminUser } from '../hooks/use-admin-user';
import { UserStatusBadge } from './user-status-badge';

interface UserDetailModalProps {
  userId: string | null;
  onClose: () => void;
}

export function UserDetailModal({ userId, onClose }: UserDetailModalProps) {
  const { data: user, isLoading } = useAdminUser(userId ?? '');

  return (
    <Modal open={!!userId} onClose={onClose} title="사용자 상세" size="md">
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {user && (
        <div className="space-y-4">
          {/* 프로필 */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-xl font-semibold text-text">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={user.displayName}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                user.displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="font-semibold text-text">{user.displayName}</p>
              <p className="text-sm text-text-muted">@{user.username}</p>
            </div>
            <div className="ml-auto">
              <UserStatusBadge user={user} />
            </div>
          </div>

          <hr className="border-border" />

          {/* 상세 정보 */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-text-muted">이메일</dt>
              <dd className="mt-0.5 text-text">{user.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted">가입일</dt>
              <dd className="mt-0.5 text-text">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</dd>
            </div>
            <div>
              <dt className="text-text-muted">마지막 로그인</dt>
              <dd className="mt-0.5 text-text">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('ko-KR') : '—'}
              </dd>
            </div>
            {user.suspendedUntil && new Date(user.suspendedUntil) > new Date() && (
              <div>
                <dt className="text-text-muted">정지 해제일</dt>
                <dd className="mt-0.5 text-warning">
                  {new Date(user.suspendedUntil).getFullYear() === 9999
                    ? '영구 정지'
                    : new Date(user.suspendedUntil).toLocaleDateString('ko-KR')}
                </dd>
              </div>
            )}
          </dl>

          {/* 권한 그룹 */}
          {user.permissionGroups.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-text-muted">권한 그룹</p>
              <div className="flex flex-wrap gap-2">
                {user.permissionGroups.map((g) => (
                  <Badge key={g.id} variant="default">{g.name}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
