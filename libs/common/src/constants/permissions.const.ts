/**
 * PERMISSIONS, Permission, hasPermission 은 @weaver2/shared에서 관리합니다.
 * (백엔드 · 프론트엔드 공용 단일 진실 공급원)
 *
 * 기존 import 경로(@weaver2/common/constants/permissions.const)는 유지됩니다.
 */
export { PERMISSIONS, type Permission, hasPermission } from '@weaver2/shared';

/** 관리자 UI에서 사용할 전체 Permission 목록 (백엔드 전용) */
export const ALL_PERMISSIONS: { value: string; label: string }[] = [
  // Post
  { value: 'post:create', label: '게시글 작성' },
  { value: 'post:read', label: '게시글 읽기' },
  { value: 'post:read:all', label: '게시글 전체 열람 (비밀글 포함)' },
  { value: 'post:update:own', label: '본인 게시글 수정' },
  { value: 'post:update:all', label: '모든 게시글 수정' },
  { value: 'post:delete:own', label: '본인 게시글 삭제' },
  { value: 'post:delete:all', label: '모든 게시글 삭제' },
  { value: 'post:*', label: '게시글 전체 권한' },

  // Comment
  { value: 'comment:create', label: '댓글 작성' },
  { value: 'comment:read', label: '댓글 읽기' },
  { value: 'comment:update:own', label: '본인 댓글 수정' },
  { value: 'comment:update:all', label: '모든 댓글 수정' },
  { value: 'comment:delete:own', label: '본인 댓글 삭제' },
  { value: 'comment:delete:all', label: '모든 댓글 삭제' },
  { value: 'comment:*', label: '댓글 전체 권한' },

  // Board
  { value: 'board:create', label: '게시판 생성' },
  { value: 'board:read', label: '게시판 조회' },
  { value: 'board:update', label: '게시판 수정' },
  { value: 'board:delete', label: '게시판 삭제' },
  { value: 'board:manage', label: '게시판 권한 관리' },
  { value: 'board:*', label: '게시판 전체 권한' },

  // User
  { value: 'user:read', label: '사용자 조회' },
  { value: 'user:update:own', label: '본인 정보 수정' },
  { value: 'user:update:all', label: '모든 사용자 정보 수정' },
  { value: 'user:delete:own', label: '본인 계정 삭제' },
  { value: 'user:delete:all', label: '모든 사용자 계정 삭제' },
  { value: 'user:suspend', label: '사용자 정지' },
  { value: 'user:*', label: '사용자 전체 권한' },

  // Admin
  { value: 'admin:access', label: '관리자 페이지 접근' },
  { value: 'admin:dashboard', label: '관리자 대시보드' },
  { value: 'admin:system-settings', label: '시스템 설정' },
  { value: 'admin:security', label: '보안 관리' },
  { value: 'admin:*', label: '관리자 전체 권한' },

  // Email
  { value: 'email:send', label: '이메일 발송' },
  { value: 'email:template:manage', label: '이메일 템플릿 관리' },
  { value: 'email:log:read', label: '이메일 로그 조회' },
  { value: 'email:*', label: '이메일 전체 권한' },

  // Analytics
  { value: 'analytics:read', label: '분석 데이터 조회' },
  { value: 'analytics:manage', label: '분석 데이터 관리' },
  { value: 'analytics:*', label: '분석 전체 권한' },

  // Terms
  { value: 'terms:read', label: '약관 조회' },
  { value: 'terms:manage', label: '약관 관리' },
  { value: 'terms:*', label: '약관 전체 권한' },

  // Permission Group
  { value: 'permission-group:read', label: '권한 그룹 조회' },
  { value: 'permission-group:create', label: '권한 그룹 생성' },
  { value: 'permission-group:update', label: '권한 그룹 수정' },
  { value: 'permission-group:delete', label: '권한 그룹 삭제' },
  { value: 'permission-group:assign-user', label: '사용자 그룹 할당' },
  { value: 'permission-group:*', label: '권한 그룹 전체 권한' },

  // Upload
  { value: 'upload:create', label: '파일 업로드' },
  { value: 'upload:read', label: '파일 조회' },
  { value: 'upload:delete', label: '파일 삭제' },
  { value: 'upload:*', label: '파일 전체 권한' },

  // Abuse Report
  { value: 'abuse-report:create', label: '신고 접수' },
  { value: 'abuse-report:read', label: '신고 목록 조회' },
  { value: 'abuse-report:update', label: '신고 처리' },
  { value: 'abuse-report:*', label: '신고 전체 권한' },

  // Moderation
  { value: 'moderation:content:hide', label: '콘텐츠 숨김/복원' },
  { value: 'moderation:content:delete', label: '콘텐츠 삭제' },
  { value: 'moderation:user:warn', label: '유저 경고' },
  { value: 'moderation:*', label: '모더레이션 전체 권한' },

  // Super
  { value: '*:*', label: '슈퍼 관리자 (전체 권한)' },
];
