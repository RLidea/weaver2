import { Badge } from '@/shared/components/ui/badge';
import { type AdminUser, getUserStatus } from '../types';

interface UserStatusBadgeProps {
  user: AdminUser;
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
