export interface AdminUserPermissionGroup {
  id: string;
  name: string;
}

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  profileImageUrl: string | null;
  suspendedUntil: string | null;
  deletedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  permissionGroups: AdminUserPermissionGroup[];
}

export type UserStatus = 'active' | 'suspended' | 'deleted';
export type UserStatusFilter = 'active' | 'suspended' | 'deleted' | 'all';

export interface AdminUsersParams {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  status?: UserStatusFilter;
  createdFrom?: string;
  createdTo?: string;
}

export interface AdminUsersResponse {
  total: number;
  limit: number;
  currentItemCount: number;
  currentPage: number;
  firstPage: number;
  lastPage: number;
  nextPage: number | null;
  prevPage: number | null;
  data: AdminUser[];
}

export interface AdminUpdateUserRequest {
  displayName?: string;
  username?: string;
  email?: string;
}

export interface SuspendUserRequest {
  days?: number;
  reason?: string;
}

export function getUserStatus(user: AdminUser): UserStatus {
  if (user.deletedAt) return 'deleted';
  if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) return 'suspended';
  return 'active';
}
