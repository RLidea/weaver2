import type { FeatureManifest } from '@weaver2/module-registry';

export const searchFeature: FeatureManifest = {
  id: 'search',
  layer: 'features',
  description: '풀텍스트 검색 — 게시글·댓글 raw SQL 검색',
  dependsOn: [
    { id: 'board', kind: 'soft', reason: 'Post/Comment를 검색 대상으로 쿼리 (타입 import)' },
    { id: 'auth', kind: 'hard', reason: 'jwt-auth.guard 사용 (인증 가드)' },
  ],
  footprint: {
    backendDir: 'apps/core-backend/src/features/search',
  },
  removalNotes: [],
};
