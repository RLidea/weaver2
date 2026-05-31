import type { FeatureManifest } from '@weaver2/module-registry';

export const bannerFeature: FeatureManifest = {
  id: 'banner',
  layer: 'features',
  description: '배너/팝업 — 슬롯별 노출, 게시기간, 활성토글, 정렬. self-contained(인바운드 의존 0)',

  // backend는 auth+permission만 코드 의존. upload는 backend가 import하지 않으므로
  // dependsOn에 넣지 않는다(추출기와 일치). 이미지 업로드는 프론트가 upload API로 처리.
  dependsOn: [
    { id: 'auth', kind: 'hard', reason: 'JwtAuthGuard 사용 (관리 컨트롤러 인증)' },
    { id: 'permission', kind: 'hard', reason: 'RequirePermission(BANNER.MANAGE) 데코레이터' },
  ],

  footprint: {
    backendDir: 'apps/core-backend/src/features/banner',
    frontendDirs: [
      'apps/core-frontend/src/features/banner',
      'apps/core-frontend/src/features/admin/banners',
    ],
    prismaSchema: 'apps/core-backend/prisma/schema/banner.prisma',
    prismaModels: ['Banner'],
    coreBackrefs: ['User.banners'],
    permissions: ['PERMISSIONS.BANNER'],
    seeds: ['apps/core-backend/prisma/seed/banner-permission.seed.ts'],
    routes: ['apps/core-frontend/src/app/(admin)/admin/banners'],
    pinpoints: [
      'apps/core-backend/src/core.module.ts → BannerModule',
      'apps/core-backend/src/system/admin/api/admin-api.module.ts → BannerModule',
      'apps/core-frontend/src/proxy.ts → /banners',
      'apps/core-backend/prisma/seed/permission-group.seed.ts → PERMISSIONS.BANNER.*',
      'libs/shared/src/index.ts → PERMISSIONS.BANNER',
      'libs/common/src/constants/permissions.const.ts → banner:manage',
    ],
  },

  removalNotes: [],
};
