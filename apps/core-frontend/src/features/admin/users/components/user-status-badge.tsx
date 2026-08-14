import { Badge } from '@weaver2/ui';
import { getUserStatus, type UserStatusSource } from '../types';

interface UserStatusBadgeProps {
  /** 판정에 쓰이는 두 필드만 받는다 — 자세한 이유는 `UserStatusSource` 주석 참고. */
  user: UserStatusSource;
}

const STATUS_CONFIG = {
  active: { variant: 'success', label: '활성' },
  suspended: { variant: 'warning', label: '정지' },
  deleted: { variant: 'error', label: '삭제됨' },
} as const;

export function UserStatusBadge({ user }: UserStatusBadgeProps) {
  const status = getUserStatus(user);
  const { variant, label } = STATUS_CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}
