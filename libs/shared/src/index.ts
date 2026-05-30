/**
 * @weaver2/shared
 * 백엔드 · 프론트엔드 공용 순수 TypeScript 상수/타입/유틸리티
 * NestJS, React 등 프레임워크 의존성 없음
 */

// ── Permissions ──────────────────────────────────────────────────────────────

/**
 * Permission 상수 정의
 *
 * 형식: resource:action 또는 resource:action:scope
 * scope: own (본인 리소스만), all (모든 리소스)
 *
 * 와일드카드:
 * - resource:* → 해당 리소스 전체 권한
 * - *:* → 슈퍼 관리자 (전체 권한)
 */
export const PERMISSIONS = {
  /** 게시글 */
  POST: {
    CREATE: 'post:create',
    READ: 'post:read',
    READ_ALL: 'post:read:all',
    UPDATE_OWN: 'post:update:own',
    UPDATE_ALL: 'post:update:all',
    DELETE_OWN: 'post:delete:own',
    DELETE_ALL: 'post:delete:all',
    ALL: 'post:*',
  },

  /** 댓글 */
  COMMENT: {
    CREATE: 'comment:create',
    READ: 'comment:read',
    UPDATE_OWN: 'comment:update:own',
    UPDATE_ALL: 'comment:update:all',
    DELETE_OWN: 'comment:delete:own',
    DELETE_ALL: 'comment:delete:all',
    ALL: 'comment:*',
  },

  /** 게시판 */
  BOARD: {
    CREATE: 'board:create',
    READ: 'board:read',
    UPDATE: 'board:update',
    DELETE: 'board:delete',
    MANAGE: 'board:manage',
    ALL: 'board:*',
  },

  /** 사용자 */
  USER: {
    READ: 'user:read',
    UPDATE_OWN: 'user:update:own',
    UPDATE_ALL: 'user:update:all',
    DELETE_OWN: 'user:delete:own',
    DELETE_ALL: 'user:delete:all',
    SUSPEND: 'user:suspend',
    ALL: 'user:*',
  },

  /** 관리자 */
  ADMIN: {
    ACCESS: 'admin:access',
    DASHBOARD: 'admin:dashboard',
    SYSTEM_SETTINGS: 'admin:system-settings',
    SECURITY: 'admin:security',
    ALL: 'admin:*',
  },

  /** 이메일 */
  EMAIL: {
    SEND: 'email:send',
    TEMPLATE_MANAGE: 'email:template:manage',
    LOG_READ: 'email:log:read',
    ALL: 'email:*',
  },

  /** 분석 */
  ANALYTICS: {
    READ: 'analytics:read',
    MANAGE: 'analytics:manage',
    ALL: 'analytics:*',
  },

  /** 약관 */
  TERMS: {
    READ: 'terms:read',
    MANAGE: 'terms:manage',
    ALL: 'terms:*',
  },

  /** 권한 그룹 */
  PERMISSION_GROUP: {
    READ: 'permission-group:read',
    CREATE: 'permission-group:create',
    UPDATE: 'permission-group:update',
    DELETE: 'permission-group:delete',
    ASSIGN_USER: 'permission-group:assign-user',
    ALL: 'permission-group:*',
  },

  /** 파일 업로드 */
  UPLOAD: {
    CREATE: 'upload:create',
    READ: 'upload:read',
    DELETE: 'upload:delete',
    ALL: 'upload:*',
  },

  /** 신고 */
  ABUSE_REPORT: {
    CREATE: 'abuse-report:create',
    READ: 'abuse-report:read',
    UPDATE: 'abuse-report:update',
    ALL: 'abuse-report:*',
  },

  /** 모더레이션 */
  MODERATION: {
    CONTENT_HIDE: 'moderation:content:hide',
    CONTENT_DELETE: 'moderation:content:delete',
    USER_WARN: 'moderation:user:warn',
    ALL: 'moderation:*',
  },

  /** 슈퍼 관리자 */
  SUPER: '*:*',
} as const;

/** Permission 문자열 타입 */
export type Permission =
  | (typeof PERMISSIONS.POST)[keyof typeof PERMISSIONS.POST]
  | (typeof PERMISSIONS.COMMENT)[keyof typeof PERMISSIONS.COMMENT]
  | (typeof PERMISSIONS.BOARD)[keyof typeof PERMISSIONS.BOARD]
  | (typeof PERMISSIONS.USER)[keyof typeof PERMISSIONS.USER]
  | (typeof PERMISSIONS.ADMIN)[keyof typeof PERMISSIONS.ADMIN]
  | (typeof PERMISSIONS.EMAIL)[keyof typeof PERMISSIONS.EMAIL]
  | (typeof PERMISSIONS.ANALYTICS)[keyof typeof PERMISSIONS.ANALYTICS]
  | (typeof PERMISSIONS.TERMS)[keyof typeof PERMISSIONS.TERMS]
  | (typeof PERMISSIONS.PERMISSION_GROUP)[keyof typeof PERMISSIONS.PERMISSION_GROUP]
  | (typeof PERMISSIONS.UPLOAD)[keyof typeof PERMISSIONS.UPLOAD]
  | (typeof PERMISSIONS.ABUSE_REPORT)[keyof typeof PERMISSIONS.ABUSE_REPORT]
  | (typeof PERMISSIONS.MODERATION)[keyof typeof PERMISSIONS.MODERATION]
  | typeof PERMISSIONS.SUPER;

/**
 * 사용자 권한 확인 유틸리티
 *
 * 와일드카드 지원:
 * - '*:*'        → 슈퍼 관리자 (전체 허용)
 * - 'resource:*' → 해당 리소스 전체 허용
 */
export function hasPermission(
  userPermissions: string[],
  required: string,
): boolean {
  return userPermissions.some(
    (p) =>
      p === required ||
      p === PERMISSIONS.SUPER ||
      p === required.split(':')[0] + ':*',
  );
}
