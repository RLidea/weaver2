import type { FeatureManifest } from '@weaver2/module-registry';

export const abuseReportFeature: FeatureManifest = {
  id: 'abuse-report',
  layer: 'features',
  description:
    '신고/모더레이션 — 다형 신고(Post/Comment/User/Media), 숨김·삭제, 경고·정지',
  dependsOn: [
    {
      id: 'board',
      kind: 'hard',
      reason:
        'ModerationService가 board 커맨드 직접 호출, AbuseReportTarget.POST/COMMENT',
    },
    { id: 'auth', kind: 'hard', reason: 'jwt-auth.guard 사용 (인증 가드)' },
    { id: 'permission', kind: 'hard' },
    {
      id: 'user',
      kind: 'hard',
      reason:
        'ModerationService가 WarnUser/Suspend/UnsuspendUser 커맨드 직접 호출',
    },
    {
      id: 'notification',
      kind: 'soft',
      reason: '신고 처리/기각 시 신고자에게 알림',
    },
  ],
  footprint: {
    backendDir: 'apps/core-backend/src/features/abuse-report',
    prismaSchema: 'apps/core-backend/prisma/schema/abuse-report.prisma',
    prismaModels: ['AbuseReport'],
    permissions: [
      'PERMISSIONS.ABUSE_REPORT',
      'PERMISSIONS.MODERATION',
      'PERMISSIONS.USER',
    ],
  },
  removalNotes: [],
};
