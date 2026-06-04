/**
 * Banner 모듈 등록 지점 정의 (recipe)
 *
 * 각 값은 Plan1/Plan2에서 실제 작성된 코드와 1:1로 대조해 확정:
 *  - core.module.ts: BannerModule import from './features/banner/banner.module'
 *  - admin-api.module.ts: BannerModule import from '../../../features/banner/banner.module'
 *  - manifests.ts: bannerFeature import from './banner/banner.feature', array ALL_MANIFESTS
 *  - libs/shared/src/index.ts: PERMISSIONS.BANNER = { READ, MANAGE, ALL }
 *    Permission union 멤버: (typeof PERMISSIONS.BANNER)[keyof typeof PERMISSIONS.BANNER]
 *  - admin-sidebar.tsx: NAV_ITEMS 항목, ImageIcon from '@/shared/components/ui/icons'
 *  - permissions.const.ts: ALL_PERMISSIONS 배열 항목 3개
 *  - auth.prisma: User.banners Banner[] (이미 존재하므로 멱등 skip 대상)
 *  - permission-group.seed.ts: Admin 그룹 permissions 배열의 PERMISSIONS.BANNER.ALL (line 44)
 */
export const BANNER_RECIPE = {
  id: 'banner',

  // 1. apps/core-backend/src/core.module.ts
  coreModule: {
    file: 'apps/core-backend/src/core.module.ts',
    importName: 'BannerModule',
    importPath: './features/banner/banner.module',
  },

  // 2. apps/core-backend/src/system/admin/api/admin-api.module.ts
  adminApiModule: {
    file: 'apps/core-backend/src/system/admin/api/admin-api.module.ts',
    importName: 'BannerModule',
    importPath: '../../../features/banner/banner.module',
  },

  // 3. apps/core-backend/src/features/manifests.ts
  manifests: {
    file: 'apps/core-backend/src/features/manifests.ts',
    importName: 'bannerFeature',
    importPath: './banner/banner.feature',
    arrayName: 'ALL_MANIFESTS',
  },

  // 4. libs/shared/src/index.ts — PERMISSIONS 객체 + Permission union
  permissions: {
    file: 'libs/shared/src/index.ts',
    key: 'BANNER',
    objectLiteral: `{
    READ: 'banner:read',
    MANAGE: 'banner:manage',
    ALL: 'banner:*',
  }`,
    // Permission union에 추가할 멤버 (실제 index.ts 표현 그대로)
    unionMember: `(typeof PERMISSIONS.BANNER)[keyof typeof PERMISSIONS.BANNER]`,
  },

  // 5. apps/core-frontend/src/shared/components/layout/admin-sidebar.tsx
  //    ImageIcon은 이 파일에서 banner 전용으로 사용됨 (다른 NAV_ITEMS에 미사용)
  //
  //    주의: NAV_ITEMS는 `[...] as const`. ts-morph 접근 시 AsExpression을 거쳐야 함.
  //    getInitializerIfKind(ArrayLiteralExpression) 가 아니라
  //    getInitializerIfKind(AsExpression).getExpression().asKind(ArrayLiteralExpression) 사용.
  sidebar: {
    file: 'apps/core-frontend/src/shared/components/layout/admin-sidebar.tsx',
    iconName: 'ImageIcon',
    iconSource: '@/shared/components/ui/icons',
    // 실제 NAV_ITEMS에 존재하는 항목 그대로
    navItem: `{ label: '배너 관리', href: '/admin/banners', Icon: ImageIcon, permission: PERMISSIONS.BANNER.MANAGE, exact: false }`,
    navItemHrefMarker: "'/admin/banners'",
  },

  // 6. libs/common/src/constants/permissions.const.ts — ALL_PERMISSIONS 배열 항목
  commonPermissions: {
    file: 'libs/common/src/constants/permissions.const.ts',
    entries: [
      `{ value: 'banner:read', label: '배너 조회' }`,
      `{ value: 'banner:manage', label: '배너 관리' }`,
      `{ value: 'banner:*', label: '배너 전체 권한' }`,
    ],
    // 식별자: 배너 항목 존재 여부 확인용 마커
    marker: 'banner:read',
  },

  // 7. apps/core-backend/prisma/schema/auth.prisma — User 모델 backref
  //    실제 파일에서 확인: "// Project-specific relations (banner)" 섹션 내 존재
  //
  //    proxy.ts → /banners 는 PROTECTED_PATHS 제외(공개 라우트)이므로
  //    remove 시 proxy.ts 코드 수정 불필요 — footprint pinpoints에만 메모로 기재.
  coreBackref: {
    file: 'apps/core-backend/prisma/schema/auth.prisma',
    model: 'User',
    field: 'banners   Banner[]',
    // 삽입 위치: board 관계 블록 뒤, abuse-report 블록 앞
    anchorComment: '// Project-specific relations (banner)',
  },

  // 8. apps/core-backend/prisma/seed/permission-group.seed.ts
  //    PERMISSIONS.BANNER.ALL 위치: 'Admin' 그룹의 permissions 배열 (line 44)
  //    — Admin 그룹 permissions 배열 내 "// 배너" 주석 바로 아래에 단독 항목으로 존재.
  //    banner 제거 시 이 항목 + 주석을 함께 제거해야 remove 후 컴파일 오류가 없다.
  //    (PERMISSIONS.BANNER가 libs/shared에서 사라지므로 참조가 끊김)
  //    실제 add/remove 편집 로직은 다음 묶음에서 ts-morph로 구현.
  permissionGroupSeed: {
    file: 'apps/core-backend/prisma/seed/permission-group.seed.ts',
    member: 'PERMISSIONS.BANNER.ALL', // Admin 그룹 permissions 배열 항목 (line 44)
    groupName: 'Admin',               // 해당 권한 그룹 이름
    sectionComment: '// 배너',        // 배열 내 섹션 구분 주석
  },
} as const;
