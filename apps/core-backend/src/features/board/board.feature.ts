import type { FeatureManifest } from '@weaver2/module-registry';

export const boardFeature: FeatureManifest = {
  id: 'board',
  layer: 'features',
  description:
    '게시판 — 4단계 대댓글, 리액션, 고정글, 카테고리, 첨부, 풀텍스트 검색',

  dependsOn: [
    { id: 'auth', kind: 'hard', reason: 'jwt-auth.guard 사용 (인증 가드)' },
    {
      id: 'permission',
      kind: 'hard',
      reason: 'RequirePermission 데코레이터·PermissionService 직접 사용',
    },
    { id: 'upload', kind: 'hard', reason: 'PostFile 첨부 — @weaver2/upload' },
    {
      id: 'notification',
      kind: 'soft',
      reason:
        "EventEmitter2로 'notification.created' emit (리스너 없으면 무시)",
    },
  ],

  footprint: {
    backendDir: 'apps/core-backend/src/features/board',
    frontendDirs: [
      'apps/core-frontend/src/features/board',
      'apps/core-frontend/src/features/admin/boards',
    ],
    prismaSchema: 'apps/core-backend/prisma/schema/board.prisma',
    prismaModels: [
      'Board',
      'Post',
      'Comment',
      'PostCategory',
      'Emoji',
      'PostReaction',
      'PostFile',
    ],
    coreBackrefs: [
      'User.posts',
      'User.comments',
      'User.reactions',
      'User.files',
    ],
    permissions: [
      'PERMISSIONS.BOARD',
      'PERMISSIONS.COMMENT',
      'PERMISSIONS.POST',
    ],
    seeds: ['apps/core-backend/prisma/seed/board-permission.seed.ts'],
    routes: [
      'apps/core-frontend/src/app/(protected)/boards',
      'apps/core-frontend/src/app/(admin)/admin/boards',
    ],
    pinpoints: [
      'apps/core-backend/src/core.module.ts → BoardModule',
      'apps/core-backend/src/system/admin/api/admin-api.module.ts → BoardModule',
      'apps/core-frontend/src/proxy.ts → /boards',
      'apps/core-backend/prisma/seed/permission-group.seed.ts → PERMISSIONS.BOARD.*',
      'libs/shared/src/index.ts → PERMISSIONS.BOARD',
      'libs/common/src/constants/permissions.const.ts → board:create',
    ],
  },

  removalNotes: [
    {
      severity: 'hard',
      location:
        'apps/core-backend/src/features/abuse-report/services/moderation.service.ts',
      note: 'board의 DeletePost/HidePost/HideComment 커맨드를 직접 import·호출. 제거 시 컴파일 실패 → 게시판 신고 처리 로직 분리 필요.',
    },
    {
      severity: 'soft',
      location: 'apps/core-backend/src/features/search',
      note: 'Post/Comment 인덱싱. board 없으면 검색 결과만 비고 컴파일 정상.',
    },
    {
      severity: 'soft',
      location:
        'apps/core-backend/src/system/admin/api/services/admin-dashboard.api.service.ts',
      note: 'Post/Comment count 통계. board 없으면 0으로 표시.',
    },
  ],
};
