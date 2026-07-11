import type { components } from '@weaver2/api-client/schema';

/**
 * 백엔드 DTO에서 파생된 타입 (openapi:types로 생성된 api-schema.d.ts 참조).
 * 백엔드 DTO를 바꾸면 `pnpm openapi:types`로 재생성하면 여기서 자동 반영된다 — 손으로 미러링하지 말 것.
 */
export type AdminUser = components['schemas']['AdminUserDto'];
export type AdminUserPermissionGroup =
  components['schemas']['AdminUserPermissionGroupDto'];
export type AdminUpdateUserRequest = components['schemas']['AdminUpdateUserDto'];
export type SuspendUserRequest = components['schemas']['SuspendUserDto'];

/**
 * 프론트 전용 타입 (OpenAPI 스펙에서 파생 불가) — 유지.
 * - UserStatus/Filter: 프론트 계산용 union (백엔드에 대응 enum 없음)
 * - AdminUsersParams: 쿼리 파라미터 (쿼리 DTO는 스펙 스키마에 안 잡힘)
 * - AdminUsersResponse: offset 페이지네이션 봉투 (요소 타입 AdminUser는 생성 타입 참조)
 */
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

export function getUserStatus(user: AdminUser): UserStatus {
  if (user.deletedAt) return 'deleted';
  if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) return 'suspended';
  return 'active';
}
