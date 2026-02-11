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
    READ_ALL: 'post:read:all', // 비밀글 포함 전체 열람
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
    MANAGE: 'board:manage', // 게시판 권한 설정 관리
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
    ACCESS: 'admin:access', // 관리자 페이지 접근
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

  /** 파일 업로드 */
  UPLOAD: {
    CREATE: 'upload:create',
    READ: 'upload:read',
    DELETE: 'upload:delete',
    ALL: 'upload:*',
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
  | (typeof PERMISSIONS.UPLOAD)[keyof typeof PERMISSIONS.UPLOAD]
  | typeof PERMISSIONS.SUPER;

/** 관리자 UI에서 사용할 전체 Permission 목록 */
export const ALL_PERMISSIONS: { value: string; label: string }[] = [
  // Post
  { value: PERMISSIONS.POST.CREATE, label: '게시글 작성' },
  { value: PERMISSIONS.POST.READ, label: '게시글 읽기' },
  { value: PERMISSIONS.POST.READ_ALL, label: '게시글 전체 열람 (비밀글 포함)' },
  { value: PERMISSIONS.POST.UPDATE_OWN, label: '본인 게시글 수정' },
  { value: PERMISSIONS.POST.UPDATE_ALL, label: '모든 게시글 수정' },
  { value: PERMISSIONS.POST.DELETE_OWN, label: '본인 게시글 삭제' },
  { value: PERMISSIONS.POST.DELETE_ALL, label: '모든 게시글 삭제' },
  { value: PERMISSIONS.POST.ALL, label: '게시글 전체 권한' },

  // Comment
  { value: PERMISSIONS.COMMENT.CREATE, label: '댓글 작성' },
  { value: PERMISSIONS.COMMENT.READ, label: '댓글 읽기' },
  { value: PERMISSIONS.COMMENT.UPDATE_OWN, label: '본인 댓글 수정' },
  { value: PERMISSIONS.COMMENT.UPDATE_ALL, label: '모든 댓글 수정' },
  { value: PERMISSIONS.COMMENT.DELETE_OWN, label: '본인 댓글 삭제' },
  { value: PERMISSIONS.COMMENT.DELETE_ALL, label: '모든 댓글 삭제' },
  { value: PERMISSIONS.COMMENT.ALL, label: '댓글 전체 권한' },

  // Board
  { value: PERMISSIONS.BOARD.CREATE, label: '게시판 생성' },
  { value: PERMISSIONS.BOARD.READ, label: '게시판 조회' },
  { value: PERMISSIONS.BOARD.UPDATE, label: '게시판 수정' },
  { value: PERMISSIONS.BOARD.DELETE, label: '게시판 삭제' },
  { value: PERMISSIONS.BOARD.MANAGE, label: '게시판 권한 관리' },
  { value: PERMISSIONS.BOARD.ALL, label: '게시판 전체 권한' },

  // User
  { value: PERMISSIONS.USER.READ, label: '사용자 조회' },
  { value: PERMISSIONS.USER.UPDATE_OWN, label: '본인 정보 수정' },
  { value: PERMISSIONS.USER.UPDATE_ALL, label: '모든 사용자 정보 수정' },
  { value: PERMISSIONS.USER.DELETE_OWN, label: '본인 계정 삭제' },
  { value: PERMISSIONS.USER.DELETE_ALL, label: '모든 사용자 계정 삭제' },
  { value: PERMISSIONS.USER.SUSPEND, label: '사용자 정지' },
  { value: PERMISSIONS.USER.ALL, label: '사용자 전체 권한' },

  // Admin
  { value: PERMISSIONS.ADMIN.ACCESS, label: '관리자 페이지 접근' },
  { value: PERMISSIONS.ADMIN.DASHBOARD, label: '관리자 대시보드' },
  { value: PERMISSIONS.ADMIN.SYSTEM_SETTINGS, label: '시스템 설정' },
  { value: PERMISSIONS.ADMIN.SECURITY, label: '보안 관리' },
  { value: PERMISSIONS.ADMIN.ALL, label: '관리자 전체 권한' },

  // Email
  { value: PERMISSIONS.EMAIL.SEND, label: '이메일 발송' },
  { value: PERMISSIONS.EMAIL.TEMPLATE_MANAGE, label: '이메일 템플릿 관리' },
  { value: PERMISSIONS.EMAIL.LOG_READ, label: '이메일 로그 조회' },
  { value: PERMISSIONS.EMAIL.ALL, label: '이메일 전체 권한' },

  // Analytics
  { value: PERMISSIONS.ANALYTICS.READ, label: '분석 데이터 조회' },
  { value: PERMISSIONS.ANALYTICS.MANAGE, label: '분석 데이터 관리' },
  { value: PERMISSIONS.ANALYTICS.ALL, label: '분석 전체 권한' },

  // Terms
  { value: PERMISSIONS.TERMS.READ, label: '약관 조회' },
  { value: PERMISSIONS.TERMS.MANAGE, label: '약관 관리' },
  { value: PERMISSIONS.TERMS.ALL, label: '약관 전체 권한' },

  // Upload
  { value: PERMISSIONS.UPLOAD.CREATE, label: '파일 업로드' },
  { value: PERMISSIONS.UPLOAD.READ, label: '파일 조회' },
  { value: PERMISSIONS.UPLOAD.DELETE, label: '파일 삭제' },
  { value: PERMISSIONS.UPLOAD.ALL, label: '파일 전체 권한' },

  // Super
  { value: PERMISSIONS.SUPER, label: '슈퍼 관리자 (전체 권한)' },
];
