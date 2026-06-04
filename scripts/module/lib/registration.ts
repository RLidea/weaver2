/**
 * registration.ts
 *
 * ts-morph 기반 멱등 등록 편집.
 * 각 함수는 add/remove 쌍으로 제공하며, 이미 있으면 skip(멱등).
 *
 * 편집 대상:
 *  1. apps/core-backend/src/core.module.ts
 *  2. apps/core-backend/src/system/admin/api/admin-api.module.ts
 *  3. apps/core-backend/src/features/manifests.ts
 *  4. libs/shared/src/index.ts (PERMISSIONS.BANNER + Permission union)
 *  5. apps/core-frontend/src/shared/components/layout/admin-sidebar.tsx
 *  6. libs/common/src/constants/permissions.const.ts
 *  8. apps/core-backend/prisma/seed/permission-group.seed.ts
 */

import { Project, SyntaxKind, SourceFile, QuoteKind, IndentationText } from 'ts-morph';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { BANNER_RECIPE as R } from './banner-recipe';

// ─────────────────────────────────────────────────────────────────────────────
// 공통 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

function withSource<T>(
  root: string,
  file: string,
  fn: (sf: SourceFile) => T,
): T {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    manipulationSettings: {
      quoteKind: QuoteKind.Single,
      indentationText: IndentationText.TwoSpaces,
    },
  });
  const sf = project.addSourceFileAtPath(path.join(root, file));
  const result = fn(sf);
  sf.saveSync();
  return result;
}

/**
 * named import 멱등 추가.
 * afterSpecifier: 이 모듈 선언 바로 뒤에 삽입 (지정하면 위치 제어, 아니면 기존 imports 마지막 뒤)
 */
function ensureImport(
  sf: SourceFile,
  name: string,
  moduleSpecifier: string,
  afterSpecifier?: string,
): void {
  const existing = sf.getImportDeclaration(
    (d) => d.getModuleSpecifierValue() === moduleSpecifier,
  );
  if (existing) {
    const alreadyHas = existing.getNamedImports().some((n) => n.getName() === name);
    if (!alreadyHas) existing.addNamedImport(name);
    return;
  }

  if (afterSpecifier) {
    const afterDecl = sf.getImportDeclaration(
      (d) => d.getModuleSpecifierValue() === afterSpecifier,
    );
    if (afterDecl) {
      const afterIdx = afterDecl.getChildIndex();
      sf.insertImportDeclaration(afterIdx + 1, {
        moduleSpecifier,
        namedImports: [name],
      });
      return;
    }
  }

  sf.addImportDeclaration({ moduleSpecifier, namedImports: [name] });
}

/** import 선언 전체 제거 */
function removeImportDeclaration(
  sf: SourceFile,
  moduleSpecifier: string,
): void {
  const decl = sf.getImportDeclaration(
    (d) => d.getModuleSpecifierValue() === moduleSpecifier,
  );
  if (decl) decl.remove();
}

// ─────────────────────────────────────────────────────────────────────────────
// NestJS @Module imports 배열 조작
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @Module({ imports: [...] }) 배열에 항목 멱등 추가.
 * afterItem이 지정되면 그 뒤에 삽입, 없으면 맨 끝에 추가.
 */
function addToModuleImports(sf: SourceFile, item: string, afterItem?: string): void {
  const cls = sf.getClasses()[0];
  const decorator = cls?.getDecorator('Module');
  if (!decorator) throw new Error('@Module 데코레이터를 찾지 못함');

  const args = decorator.getArguments();
  if (args.length === 0) throw new Error('@Module 인자가 없음');

  const objLit = args[0].asKind(SyntaxKind.ObjectLiteralExpression);
  if (!objLit) throw new Error('@Module 인자가 ObjectLiteralExpression이 아님');

  const importsProp = objLit.getProperty('imports');
  if (!importsProp) throw new Error('@Module에 imports 프로퍼티가 없음');

  const arr = importsProp
    .asKind(SyntaxKind.PropertyAssignment)
    ?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
  if (!arr) throw new Error('imports 배열을 찾지 못함');

  const alreadyHas = arr.getElements().some((e) => e.getText().trim() === item);
  if (alreadyHas) return;

  if (afterItem) {
    const afterIdx = arr
      .getElements()
      .findIndex((e) => e.getText().trim() === afterItem);
    if (afterIdx >= 0) {
      arr.insertElement(afterIdx + 1, item);
      return;
    }
  }
  arr.addElement(item);
}

/** @Module({ imports: [...] }) 배열에서 항목 제거 */
function removeFromModuleImports(sf: SourceFile, item: string): void {
  const cls = sf.getClasses()[0];
  const decorator = cls?.getDecorator('Module');
  if (!decorator) return;

  const args = decorator.getArguments();
  if (args.length === 0) return;

  const objLit = args[0].asKind(SyntaxKind.ObjectLiteralExpression);
  if (!objLit) return;

  const importsProp = objLit.getProperty('imports');
  if (!importsProp) return;

  const arr = importsProp
    .asKind(SyntaxKind.PropertyAssignment)
    ?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
  if (!arr) return;

  const idx = arr.getElements().findIndex((e) => e.getText().trim() === item);
  if (idx >= 0) arr.removeElement(idx);
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 3-Step 2: backend 등록 add/remove (core.module, admin-api.module, manifests)
// ─────────────────────────────────────────────────────────────────────────────

export function addBackendRegistration(root: string): void {
  // 1. core.module.ts — BannerModule import는 BoardModule import 뒤에, 배열 항목도 BoardModule 뒤에
  withSource(root, R.coreModule.file, (sf) => {
    ensureImport(
      sf,
      R.coreModule.importName,
      R.coreModule.importPath,
      './features/board/board.module', // BoardModule import 바로 뒤에 삽입
    );
    addToModuleImports(sf, R.coreModule.importName, 'BoardModule');
  });

  // 2. admin-api.module.ts — BannerModule import는 BoardModule import 뒤에
  withSource(root, R.adminApiModule.file, (sf) => {
    ensureImport(
      sf,
      R.adminApiModule.importName,
      R.adminApiModule.importPath,
      '../../../features/board/board.module', // BoardModule import 바로 뒤에
    );
    addToModuleImports(sf, R.adminApiModule.importName, 'BoardModule');
  });

  // 3. manifests.ts — 텍스트 기반 처리 (trailing comma 보존)
  {
    const filePath = path.join(root, R.manifests.file);
    let txt = fs.readFileSync(filePath, 'utf8');

    // import 추가: searchFeature import 바로 뒤
    const searchImportLine = `import { searchFeature } from './search/search.feature';`;
    const bannerImportLine = `import { bannerFeature } from './banner/banner.feature';`;
    if (!txt.includes(bannerImportLine)) {
      if (txt.includes(searchImportLine)) {
        txt = txt.replace(searchImportLine, `${searchImportLine}\nimport { bannerFeature } from './banner/banner.feature';`);
      } else {
        console.warn('[banner] manifests.ts import: 앵커를 찾지 못해 등록을 건너뜀 — 수동 확인 필요');
      }
    }

    // 배열 항목 추가: searchFeature 뒤, trailing comma 보존
    const searchArrayEntry = `  searchFeature,`;
    const bannerArrayEntry = `  bannerFeature,`;
    if (!txt.includes(bannerArrayEntry)) {
      if (txt.includes(searchArrayEntry)) {
        txt = txt.replace(searchArrayEntry, `${searchArrayEntry}\n${bannerArrayEntry}`);
      } else {
        console.warn('[banner] manifests.ts 배열: 앵커를 찾지 못해 등록을 건너뜀 — 수동 확인 필요');
      }
    }

    fs.writeFileSync(filePath, txt);
  }
}

export function removeBackendRegistration(root: string): void {
  // 1. core.module.ts
  withSource(root, R.coreModule.file, (sf) => {
    removeFromModuleImports(sf, R.coreModule.importName);
    removeImportDeclaration(sf, R.coreModule.importPath);
  });

  // 2. admin-api.module.ts
  withSource(root, R.adminApiModule.file, (sf) => {
    removeFromModuleImports(sf, R.adminApiModule.importName);
    removeImportDeclaration(sf, R.adminApiModule.importPath);
  });

  // 3. manifests.ts — 텍스트 기반 처리
  {
    const filePath = path.join(root, R.manifests.file);
    let txt = fs.readFileSync(filePath, 'utf8');

    // import 제거
    txt = txt.replace(`\nimport { bannerFeature } from './banner/banner.feature';`, '');
    // 배열 항목 제거 (trailing newline 포함)
    txt = txt.replace(`\n  bannerFeature,`, '');

    fs.writeFileSync(filePath, txt);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 3-Step 3: PERMISSIONS add/remove (libs/shared/src/index.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * libs/shared/src/index.ts의 PERMISSIONS 객체와 Permission union을
 * 파일 텍스트 직접 치환으로 처리한다.
 *
 * ts-morph ObjectLiteral 조작은 주석/들여쓰기를 보존하지 못하므로
 * 정확한 텍스트 블록으로 add/remove한다.
 */

// PERMISSIONS 객체에 삽입할 BANNER 블록 (원본 파일 포맷 그대로)
const BANNER_PERMISSIONS_BLOCK = `
  /** 배너/팝업 */
  BANNER: {
    READ: 'banner:read',
    MANAGE: 'banner:manage',
    ALL: 'banner:*',
  },

`;

// Permission union의 BANNER 멤버 (원본 파일 포맷 그대로)
const BANNER_UNION_MEMBER = `  | (typeof PERMISSIONS.BANNER)[keyof typeof PERMISSIONS.BANNER]\n`;

export function addPermissions(root: string): void {
  const filePath = path.join(root, R.permissions.file);
  let txt = fs.readFileSync(filePath, 'utf8');

  // PERMISSIONS 객체: BOARD 블록 뒤에 BANNER 블록 삽입
  const boardBlockEnd = `    ALL: 'board:*',\n  },\n`;
  if (!txt.includes('BANNER:')) {
    if (txt.includes(boardBlockEnd)) {
      txt = txt.replace(boardBlockEnd, `${boardBlockEnd}${BANNER_PERMISSIONS_BLOCK}`);
    } else {
      console.warn('[banner] shared/index.ts PERMISSIONS 객체: 앵커를 찾지 못해 등록을 건너뜀 — 수동 확인 필요');
    }
  }

  // Permission union: BOARD 멤버 뒤에 BANNER 멤버 삽입
  const boardUnionMember = `  | (typeof PERMISSIONS.BOARD)[keyof typeof PERMISSIONS.BOARD]\n`;
  if (!txt.includes('PERMISSIONS.BANNER')) {
    if (txt.includes(boardUnionMember)) {
      txt = txt.replace(boardUnionMember, `${boardUnionMember}${BANNER_UNION_MEMBER}`);
    } else {
      console.warn('[banner] shared/index.ts Permission union: 앵커를 찾지 못해 등록을 건너뜀 — 수동 확인 필요');
    }
  }

  fs.writeFileSync(filePath, txt);
}

export function removePermissions(root: string): void {
  const filePath = path.join(root, R.permissions.file);
  let txt = fs.readFileSync(filePath, 'utf8');

  // PERMISSIONS 객체에서 BANNER 블록 제거
  if (txt.includes(BANNER_PERMISSIONS_BLOCK)) {
    txt = txt.replace(BANNER_PERMISSIONS_BLOCK, '');
  }

  // Permission union에서 BANNER 멤버 제거
  if (txt.includes(BANNER_UNION_MEMBER)) {
    txt = txt.replace(BANNER_UNION_MEMBER, '');
  }

  fs.writeFileSync(filePath, txt);
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 4-Step 1: admin-sidebar NAV_ITEMS + ImageIcon
// ─────────────────────────────────────────────────────────────────────────────

// admin-sidebar.tsx — 배너 NAV_ITEM 블록 (원본 파일 포맷 그대로)
// 앵커: 신고/제재 항목 뒤 (abuse-reports href 포함 블록)
// 신고/제재 블록이 끝나는 지점: `    exact: false,\n  },\n  {\n    label: '배너 관리'`
const BANNER_NAV_ITEM_BLOCK = `  {
    label: '배너 관리',
    href: '/admin/banners',
    Icon: ImageIcon,
    permission: PERMISSIONS.BANNER.MANAGE,
    exact: false,
  },
  {
    label: '약관 관리'`;
const BANNER_NAV_ANCHOR = `  {
    label: '약관 관리'`;

// ImageIcon import — 원본 파일 포맷
// 실제 파일: PuzzleIcon 뒤에 ImageIcon (줄 18)
const BANNER_ICON_IMPORT_ANCHOR = `  PuzzleIcon,\n} from '@/shared/components/ui/icons';`;
const BANNER_ICON_IMPORT_WITH = `  PuzzleIcon,\n  ImageIcon,\n} from '@/shared/components/ui/icons';`;

/**
 * NAV_ITEMS 텍스트 기반 add/remove.
 * ImageIcon도 텍스트로 처리 (원본 위치 보존).
 */
export function addSidebar(root: string): void {
  const filePath = path.join(root, R.sidebar.file);
  let txt = fs.readFileSync(filePath, 'utf8');

  // ImageIcon import 추가 (없는 경우만)
  if (!txt.includes('ImageIcon')) {
    if (txt.includes(BANNER_ICON_IMPORT_ANCHOR)) {
      txt = txt.replace(BANNER_ICON_IMPORT_ANCHOR, BANNER_ICON_IMPORT_WITH);
    } else {
      console.warn('[banner] admin-sidebar.tsx ImageIcon import: 앵커를 찾지 못해 등록을 건너뜀 — 수동 확인 필요');
    }
  }

  // NAV_ITEMS 배너 항목 추가 (없는 경우만)
  if (!txt.includes('/admin/banners')) {
    if (txt.includes(BANNER_NAV_ANCHOR)) {
      txt = txt.replace(BANNER_NAV_ANCHOR, BANNER_NAV_ITEM_BLOCK);
    } else {
      console.warn('[banner] admin-sidebar.tsx NAV_ITEMS: 앵커를 찾지 못해 등록을 건너뜀 — 수동 확인 필요');
    }
  }

  fs.writeFileSync(filePath, txt);
}

export function removeSidebar(root: string): void {
  const filePath = path.join(root, R.sidebar.file);
  let txt = fs.readFileSync(filePath, 'utf8');

  // NAV_ITEMS 배너 항목 제거
  if (txt.includes('/admin/banners') && txt.includes(BANNER_NAV_ITEM_BLOCK)) {
    txt = txt.replace(BANNER_NAV_ITEM_BLOCK, BANNER_NAV_ANCHOR);
  }

  // ImageIcon import 제거 (banner 전용)
  if (txt.includes('ImageIcon') && txt.includes(BANNER_ICON_IMPORT_WITH)) {
    txt = txt.replace(BANNER_ICON_IMPORT_WITH, BANNER_ICON_IMPORT_ANCHOR);
  }

  fs.writeFileSync(filePath, txt);
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 4-Step 2: libs/common ALL_PERMISSIONS 배열 항목 add/remove
// ─────────────────────────────────────────────────────────────────────────────

// libs/common ALL_PERMISSIONS에서 Banner 섹션 (원본 파일 포맷 그대로)
const BANNER_COMMON_PERMISSIONS_BLOCK = `
  // Banner
  { value: 'banner:read', label: '배너 조회' },
  { value: 'banner:manage', label: '배너 관리' },
  { value: 'banner:*', label: '배너 전체 권한' },

`;

// Banner 섹션 앞 앵커 (board:* 항목 뒤, User 섹션 앞 빈 줄 포함)
const BANNER_COMMON_ANCHOR = `  { value: 'board:*', label: '게시판 전체 권한' },\n`;

export function addCommonPermissions(root: string): void {
  const filePath = path.join(root, R.commonPermissions.file);
  let txt = fs.readFileSync(filePath, 'utf8');

  // 이미 있으면 skip
  if (txt.includes(R.commonPermissions.marker)) return;

  if (txt.includes(BANNER_COMMON_ANCHOR)) {
    txt = txt.replace(
      BANNER_COMMON_ANCHOR,
      `${BANNER_COMMON_ANCHOR}${BANNER_COMMON_PERMISSIONS_BLOCK}`,
    );
  } else {
    console.warn('[banner] permissions.const.ts ALL_PERMISSIONS: 앵커를 찾지 못해 등록을 건너뜀 — 수동 확인 필요');
  }

  fs.writeFileSync(filePath, txt);
}

export function removeCommonPermissions(root: string): void {
  const filePath = path.join(root, R.commonPermissions.file);
  let txt = fs.readFileSync(filePath, 'utf8');

  if (!txt.includes(R.commonPermissions.marker)) return;

  if (txt.includes(BANNER_COMMON_PERMISSIONS_BLOCK)) {
    txt = txt.replace(BANNER_COMMON_PERMISSIONS_BLOCK, '');
  }

  fs.writeFileSync(filePath, txt);
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 4-Step 2b: permission-group.seed.ts Admin 그룹 PERMISSIONS.BANNER.ALL + 주석
// ─────────────────────────────────────────────────────────────────────────────

// permission-group.seed.ts — Admin 그룹 PERMISSIONS.BANNER.ALL 블록 (원본 포맷 그대로)
// 앵커: PERMISSIONS.MODERATION.ALL 바로 뒤
const BANNER_SEED_ANCHOR = `      PERMISSIONS.MODERATION.ALL,\n`;
const BANNER_SEED_BLOCK = `      // 배너\n      PERMISSIONS.BANNER.ALL,\n`;

export function addPermissionGroupSeed(root: string): void {
  const filePath = path.join(root, R.permissionGroupSeed.file);
  let txt = fs.readFileSync(filePath, 'utf8');

  // 이미 있으면 skip
  if (txt.includes(R.permissionGroupSeed.member)) return;

  if (txt.includes(BANNER_SEED_ANCHOR)) {
    txt = txt.replace(
      BANNER_SEED_ANCHOR,
      `${BANNER_SEED_ANCHOR}${BANNER_SEED_BLOCK}`,
    );
  } else {
    console.warn('[banner] permission-group.seed.ts Admin 그룹: 앵커를 찾지 못해 등록을 건너뜀 — 수동 확인 필요');
  }

  fs.writeFileSync(filePath, txt);
}

export function removePermissionGroupSeed(root: string): void {
  const filePath = path.join(root, R.permissionGroupSeed.file);
  let txt = fs.readFileSync(filePath, 'utf8');

  // 없으면 skip
  if (!txt.includes(R.permissionGroupSeed.member)) return;

  if (txt.includes(BANNER_SEED_BLOCK)) {
    txt = txt.replace(BANNER_SEED_BLOCK, '');
  }

  fs.writeFileSync(filePath, txt);
}
