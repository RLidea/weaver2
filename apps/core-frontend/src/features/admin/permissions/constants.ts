export interface PermissionItem {
  value: string;
  label: string;
}

export interface PermissionSection {
  key: string;
  label: string;
  permissions: PermissionItem[];
}

export const PERMISSION_SECTIONS: PermissionSection[] = [
  {
    key: 'post',
    label: '게시글',
    permissions: [
      { value: 'post:create', label: '작성' },
      { value: 'post:read', label: '읽기' },
      { value: 'post:read:all', label: '전체 열람 (비밀글 포함)' },
      { value: 'post:update:own', label: '본인 수정' },
      { value: 'post:update:all', label: '전체 수정' },
      { value: 'post:delete:own', label: '본인 삭제' },
      { value: 'post:delete:all', label: '전체 삭제' },
      { value: 'post:*', label: '전체 권한' },
    ],
  },
  {
    key: 'comment',
    label: '댓글',
    permissions: [
      { value: 'comment:create', label: '작성' },
      { value: 'comment:read', label: '읽기' },
      { value: 'comment:update:own', label: '본인 수정' },
      { value: 'comment:update:all', label: '전체 수정' },
      { value: 'comment:delete:own', label: '본인 삭제' },
      { value: 'comment:delete:all', label: '전체 삭제' },
      { value: 'comment:*', label: '전체 권한' },
    ],
  },
  {
    key: 'board',
    label: '게시판',
    permissions: [
      { value: 'board:create', label: '생성' },
      { value: 'board:read', label: '조회' },
      { value: 'board:update', label: '수정' },
      { value: 'board:delete', label: '삭제' },
      { value: 'board:manage', label: '권한 관리' },
      { value: 'board:*', label: '전체 권한' },
    ],
  },
  {
    key: 'user',
    label: '사용자',
    permissions: [
      { value: 'user:read', label: '조회' },
      { value: 'user:update:own', label: '본인 정보 수정' },
      { value: 'user:update:all', label: '전체 수정' },
      { value: 'user:delete:own', label: '본인 계정 삭제' },
      { value: 'user:delete:all', label: '전체 계정 삭제' },
      { value: 'user:suspend', label: '정지' },
      { value: 'user:*', label: '전체 권한' },
    ],
  },
  {
    key: 'admin',
    label: '관리자',
    permissions: [
      { value: 'admin:access', label: '페이지 접근' },
      { value: 'admin:dashboard', label: '대시보드' },
      { value: 'admin:system-settings', label: '시스템 설정' },
      { value: 'admin:security', label: '보안 관리' },
      { value: 'admin:*', label: '전체 권한' },
    ],
  },
  {
    key: 'permission-group',
    label: '권한 그룹',
    permissions: [
      { value: 'permission-group:read', label: '조회' },
      { value: 'permission-group:create', label: '생성' },
      { value: 'permission-group:update', label: '수정' },
      { value: 'permission-group:delete', label: '삭제' },
      { value: 'permission-group:assign-user', label: '사용자 할당' },
      { value: 'permission-group:*', label: '전체 권한' },
    ],
  },
  {
    key: 'abuse-report',
    label: '신고/모더레이션',
    permissions: [
      { value: 'abuse-report:create', label: '신고 접수' },
      { value: 'abuse-report:read', label: '신고 조회' },
      { value: 'abuse-report:update', label: '신고 처리' },
      { value: 'abuse-report:*', label: '신고 전체 권한' },
      { value: 'moderation:content:hide', label: '콘텐츠 숨김/복원' },
      { value: 'moderation:content:delete', label: '콘텐츠 삭제' },
      { value: 'moderation:user:warn', label: '유저 경고' },
      { value: 'moderation:*', label: '모더레이션 전체 권한' },
    ],
  },
  {
    key: 'email',
    label: '이메일',
    permissions: [
      { value: 'email:send', label: '발송' },
      { value: 'email:template:manage', label: '템플릿 관리' },
      { value: 'email:log:read', label: '로그 조회' },
      { value: 'email:*', label: '전체 권한' },
    ],
  },
  {
    key: 'terms',
    label: '약관',
    permissions: [
      { value: 'terms:read', label: '조회' },
      { value: 'terms:manage', label: '관리' },
      { value: 'terms:*', label: '전체 권한' },
    ],
  },
  {
    key: 'upload',
    label: '파일',
    permissions: [
      { value: 'upload:create', label: '업로드' },
      { value: 'upload:read', label: '조회' },
      { value: 'upload:delete', label: '삭제' },
      { value: 'upload:*', label: '전체 권한' },
    ],
  },
  {
    key: 'analytics',
    label: '분석',
    permissions: [
      { value: 'analytics:read', label: '조회' },
      { value: 'analytics:manage', label: '관리' },
      { value: 'analytics:*', label: '전체 권한' },
    ],
  },
  {
    key: 'super',
    label: '슈퍼 관리자',
    permissions: [{ value: '*:*', label: '전체 권한 (슈퍼 관리자)' }],
  },
];
