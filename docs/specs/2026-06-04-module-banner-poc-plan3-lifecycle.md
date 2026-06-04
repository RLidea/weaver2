# Banner 모듈 라이프사이클 구현 계획 (Plan 3 / 3) — extract · remove · add 왕복

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** banner 모듈을 로컬 카탈로그로 추출(extract)하고, footprint 기반으로 메인에서 제거(remove)·재설치(add)하는 CLI 왕복을 구현한다. 핵심 검증은 **"banner를 제거해도 빌드·테스트가 안 깨진다"(self-contained 증명)** 와 **add→remove→add 멱등**이다.

**Architecture:** `scripts/module/`에 tsx 실행 스크립트(extract/remove/add)와 두 유틸(`footprint-io` = 파일 복사/삭제, `registration` = ts-morph로 6개 등록 지점의 banner 줄 삽입/삭제)을 둔다. 등록은 **glob codegen이 아닌 AST 정밀 편집(방식 A)** — 기존 수동 등록 구조를 유지하고 banner 줄만 건드린다. DB(prisma migrate)는 스크립트가 안내만 하고 사용자가 직접 실행한다.

**Tech Stack:** tsx, ts-morph(이미 `@weaver2/module-registry`가 사용), Node fs, 기존 `extractManifest`/`analyzeRemoval` 재사용.

> **방식 A 결정 근거:** 등록 6곳을 glob codegen으로 전환(방식 B)하려면 core.module 개편 + PERMISSIONS 병합 재설계(타 모듈 영향) + webpack 호환 검증이 필요해 PoC 범위를 초과한다. A는 라이프사이클 몸통(extract·파일처리·migrate·검증)을 완성하고 등록만 AST로 처리 → B로 갈 때 등록 처리 한 조각만 codegen으로 교체되고 나머지는 그대로 재사용된다.

> **안전:** 스크립트가 실제 파일을 삭제/편집한다. 반드시 **워킹트리가 깨끗한(committed) 상태**에서 실행해 `git restore`로 복구 가능하게 한다. remove/add 스크립트 시작 시 `git status`가 더러우면 경고하고 중단한다.

---

## 등록 지점 6곳 (AST/텍스트 편집 대상) — banner recipe

| # | 파일 | 편집 내용 | 도구 |
|---|---|---|---|
| 1 | `apps/core-backend/src/core.module.ts` | `import { BannerModule }` + `imports` 배열 항목 | ts-morph |
| 2 | `apps/core-backend/src/system/admin/api/admin-api.module.ts` | `import { BannerModule }` + `imports` 배열 항목 | ts-morph |
| 3 | `apps/core-backend/src/features/manifests.ts` | `import { bannerFeature }` + `ALL_MANIFESTS` 항목 | ts-morph |
| 4 | `libs/shared/src/index.ts` | `PERMISSIONS.BANNER` 객체 + `Permission` union 라인 | ts-morph |
| 5 | `apps/core-frontend/src/shared/components/layout/admin-sidebar.tsx` | `ImageIcon` import + `NAV_ITEMS` 항목 | ts-morph |
| 6 | `libs/common/src/constants/permissions.const.ts` | banner 권한 카탈로그 항목 3개 | ts-morph |

추가:
| 7 | `apps/core-backend/prisma/schema/auth.prisma` | User 모델의 `banners Banner[]` backref (footprint.coreBackrefs) | 정규식/문자열 |
| 8 | `apps/core-backend/prisma/seed/permission-group.seed.ts` | Admin 그룹 permissions 배열의 `PERMISSIONS.BANNER.ALL` 항목 | ts-morph |

> **★ 8번은 리뷰에서 발견된 banner의 숨은 inbound 의존.** 공용 시드 `permission-group.seed.ts`가 `PERMISSIONS.BANNER.ALL`을 참조하므로, remove가 `PERMISSIONS.BANNER`를 지우기 전에/함께 이 라인도 제거해야 컴파일이 안 깨진다(self-contained 성립 조건). add 시 재삽입.

> **NAV_ITEMS `as const` 주의:** `admin-sidebar.tsx`의 `NAV_ITEMS`는 `[...] as const` 형태다. ts-morph 접근 시 `getInitializerIfKind(ArrayLiteralExpression)`가 아니라 `getInitializerIfKind(AsExpression).getExpression().asKind(ArrayLiteralExpression)`로 거쳐야 한다(PERMISSIONS 객체와 동일 패턴).

footprint 파일 처리(복사/삭제) 대상: `backendDir`, `frontendDirs[]`, `routes[]`, `prismaSchema`, `seeds[]`.

> 각 지점 편집은 **멱등**이어야 한다: add는 이미 있으면 skip, remove는 없으면 skip. 그래야 왕복 반복이 안전하다.

---

## 파일 구조

**생성:**
- `scripts/module/lib/banner-recipe.ts` — banner의 등록 지점 정의(모듈명·경로·PERMISSIONS 값·NAV 항목 등)
- `scripts/module/lib/footprint-io.ts` — footprint 기반 디렉토리/파일 복사·삭제
- `scripts/module/lib/registration.ts` — ts-morph로 등록 지점 add/remove (멱등)
- `scripts/module/lib/prisma-backref.ts` — auth.prisma의 coreBackref 텍스트 add/remove
- `scripts/module/lib/git-guard.ts` — 워킹트리 청결 확인
- `scripts/module/extract.ts` — 메인 → `catalog/modules/<id>/` 미러 복사
- `scripts/module/remove.ts` — footprint 삭제 + 등록 제거 + migrate 안내
- `scripts/module/add.ts` — catalog 복사 + 등록 삽입 + migrate 안내
- `catalog/modules/banner/` — extract 산출물(스크립트가 생성)

**수정:**
- 루트 `package.json` — `module:extract`/`module:remove`/`module:add` 스크립트

> 구현 전 `scripts/module-registry/generate.ts`(기존 tsx 스크립트)와 `libs/module-registry/src/index.ts`의 export(`extractManifest`, `analyzeRemoval`, `buildDependencyGraph`)를 확인해 재사용한다. ts-morph는 `@weaver2/module-registry`가 의존하므로 동일 버전 사용.

---

## Task 1: git-guard + footprint-io 유틸

**Files:** `scripts/module/lib/git-guard.ts`, `scripts/module/lib/footprint-io.ts`

- [ ] **Step 1: git-guard.ts**

```typescript
import { execSync } from 'node:child_process';

/** 워킹트리가 더러우면 throw. 실수로 미커밋 변경 위에 덮어쓰는 것 방지. */
export function assertCleanWorktree(): void {
  const out = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (out) {
    throw new Error(
      '워킹트리에 커밋되지 않은 변경이 있습니다. 커밋/스태시 후 다시 실행하세요.\n' + out,
    );
  }
}
```

- [ ] **Step 2: footprint-io.ts**

footprint의 디렉토리/파일 경로를 받아 복사(add)·삭제(remove)한다. `fs.cpSync(recursive)`/`fs.rmSync(recursive)` 사용. 경로 없으면 skip(멱등).

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';

export function removePath(root: string, rel: string): void {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) {
    fs.rmSync(abs, { recursive: true, force: true });
    console.log(`  ✗ 삭제: ${rel}`);
  }
}

export function copyDir(srcRoot: string, srcRel: string, destRoot: string, destRel: string): void {
  const src = path.join(srcRoot, srcRel);
  const dest = path.join(destRoot, destRel);
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log(`  → 복사: ${srcRel} → ${destRel}`);
}
```

- [ ] **Step 3: Commit** (묶음 단위로 모아 승인 후 커밋)

---

## Task 2: banner-recipe — 등록 지점 정의

**Files:** `scripts/module/lib/banner-recipe.ts`

- [ ] **Step 1: recipe 작성** — 각 등록 지점에 필요한 식별자/코드 조각을 한곳에 정의. registration.ts가 이걸 소비.

```typescript
export const BANNER_RECIPE = {
  id: 'banner',

  // 1. core.module.ts
  coreModule: {
    file: 'apps/core-backend/src/core.module.ts',
    importName: 'BannerModule',
    importPath: './features/banner/banner.module',
  },
  // 2. admin-api.module.ts
  adminApiModule: {
    file: 'apps/core-backend/src/system/admin/api/admin-api.module.ts',
    importName: 'BannerModule',
    importPath: '../../../features/banner/banner.module',
  },
  // 3. manifests.ts
  manifests: {
    file: 'apps/core-backend/src/features/manifests.ts',
    importName: 'bannerFeature',
    importPath: './banner/banner.feature',
    arrayName: 'ALL_MANIFESTS',
  },
  // 4. libs/shared PERMISSIONS
  permissions: {
    file: 'libs/shared/src/index.ts',
    key: 'BANNER',
    objectLiteral: `{
    READ: 'banner:read',
    MANAGE: 'banner:manage',
    ALL: 'banner:*',
  }`,
    // Permission union에 추가할 라인 (실제 union 표현은 index.ts 확인 후 맞춤)
    unionMember: `(typeof PERMISSIONS.BANNER)[keyof typeof PERMISSIONS.BANNER]`,
  },
  // 5. admin-sidebar NAV_ITEMS
  sidebar: {
    file: 'apps/core-frontend/src/shared/components/layout/admin-sidebar.tsx',
    iconName: 'ImageIcon',
    navItem: `{ label: '배너 관리', href: '/admin/banners', Icon: ImageIcon, permission: PERMISSIONS.BANNER.MANAGE, exact: false }`,
  },
  // 6. libs/common 권한 카탈로그
  commonPermissions: {
    file: 'libs/common/src/constants/permissions.const.ts',
    entries: [
      `{ value: 'banner:read', label: '배너 조회' }`,
      `{ value: 'banner:manage', label: '배너 관리' }`,
      `{ value: 'banner:*', label: '배너 전체 권한' }`,
    ],
  },
  // 7. prisma backref
  coreBackref: {
    file: 'apps/core-backend/prisma/schema/auth.prisma',
    model: 'User',
    field: 'banners   Banner[]',
  },
} as const;
```

> recipe의 정확한 값(import 경로, union 표현, NAV 키)은 Plan1/Plan2에서 실제 작성된 코드와 1:1로 맞춘다. 구현 시 각 대상 파일을 열어 대조.

- [ ] **Step 2: Commit**

---

## Task 3: registration — ts-morph 등록 편집 (backend 4곳)

**Files:** `scripts/module/lib/registration.ts`

> ts-morph로 import 선언과 배열/객체를 멱등 편집한다. 대표 패턴 2개(모듈 import+배열, PERMISSIONS 객체)를 보이고, 나머지는 동일 패턴 적용.

- [ ] **Step 1: 공통 헬퍼 (모듈 import + 배열 항목)**

```typescript
import { Project, SyntaxKind } from 'ts-morph';
import * as path from 'node:path';

function withSource<T>(root: string, file: string, fn: (sf: import('ts-morph').SourceFile) => T): T {
  const project = new Project({ tsConfigFilePath: undefined, skipAddingFilesFromTsConfig: true });
  const sf = project.addSourceFileAtPath(path.join(root, file));
  const result = fn(sf);
  sf.saveSync();
  return result;
}

/** import 선언 멱등 추가 */
function ensureImport(sf: import('ts-morph').SourceFile, name: string, moduleSpecifier: string) {
  const existing = sf.getImportDeclaration(
    (d) => d.getModuleSpecifierValue() === moduleSpecifier,
  );
  if (existing) {
    if (!existing.getNamedImports().some((n) => n.getName() === name)) existing.addNamedImport(name);
    return;
  }
  sf.addImportDeclaration({ moduleSpecifier, namedImports: [name] });
}

function removeImport(sf: import('ts-morph').SourceFile, name: string, moduleSpecifier: string) {
  const decl = sf.getImportDeclaration((d) => d.getModuleSpecifierValue() === moduleSpecifier);
  if (decl) decl.remove();
}

/** 배열 리터럴에 식별자 항목 멱등 추가/제거 (NestJS imports, ALL_MANIFESTS 등) */
function ensureArrayItem(sf: import('ts-morph').SourceFile, arrayMatcher: (text: string) => boolean, item: string) {
  const arr = sf.getDescendantsOfKind(SyntaxKind.ArrayLiteralExpression)
    .find((a) => arrayMatcher(a.getParent()?.getText() ?? ''));
  if (!arr) throw new Error(`배열을 찾지 못함: ${item}`);
  if (!arr.getElements().some((e) => e.getText() === item)) arr.addElement(item);
}

function removeArrayItem(sf: import('ts-morph').SourceFile, item: string) {
  const arr = sf.getDescendantsOfKind(SyntaxKind.ArrayLiteralExpression)
    .find((a) => a.getElements().some((e) => e.getText() === item));
  const el = arr?.getElements().find((e) => e.getText() === item);
  el?.remove();
}
```

> `arrayMatcher`는 NestJS `@Module({ imports: [...] })`의 imports 배열을 식별하기 위한 것. 실제로는 `@Module` 데코레이터 인자의 `imports` 프로퍼티를 찾는 게 정확하다. 구현 시 core.module.ts 구조를 보고 `getProperty('imports')` 방식으로 정밀화한다.

- [ ] **Step 2: core.module / admin-api.module / manifests 등록 add/remove**

```typescript
import { BANNER_RECIPE as R } from './banner-recipe';

export function addBackendRegistration(root: string) {
  // core.module
  withSource(root, R.coreModule.file, (sf) => {
    ensureImport(sf, R.coreModule.importName, R.coreModule.importPath);
    addToModuleImports(sf, R.coreModule.importName); // @Module imports 배열
  });
  // admin-api.module (동일 패턴)
  withSource(root, R.adminApiModule.file, (sf) => {
    ensureImport(sf, R.adminApiModule.importName, R.adminApiModule.importPath);
    addToModuleImports(sf, R.adminApiModule.importName);
  });
  // manifests
  withSource(root, R.manifests.file, (sf) => {
    ensureImport(sf, R.manifests.importName, R.manifests.importPath);
    ensureArrayItem(sf, (t) => t.includes(R.manifests.arrayName), R.manifests.importName);
  });
}

export function removeBackendRegistration(root: string) {
  withSource(root, R.coreModule.file, (sf) => {
    removeFromModuleImports(sf, R.coreModule.importName);
    removeImport(sf, R.coreModule.importName, R.coreModule.importPath);
  });
  withSource(root, R.adminApiModule.file, (sf) => {
    removeFromModuleImports(sf, R.adminApiModule.importName);
    removeImport(sf, R.adminApiModule.importName, R.adminApiModule.importPath);
  });
  withSource(root, R.manifests.file, (sf) => {
    removeArrayItem(sf, R.manifests.importName);
    removeImport(sf, R.manifests.importName, R.manifests.importPath);
  });
}
```

> `addToModuleImports`/`removeFromModuleImports`: `@Module` 데코레이터의 `imports` ArrayLiteral을 정확히 찾아 항목 추가/제거. 구현 시 `sf.getClasses()[0].getDecorator('Module')`의 인자 ObjectLiteral → `getProperty('imports')`로 접근.

- [ ] **Step 3: PERMISSIONS add/remove (libs/shared)**

`PERMISSIONS` ObjectLiteral에 `BANNER` 프로퍼티를 add/remove + `Permission` 타입 union의 BANNER 멤버 라인 add/remove. ObjectLiteral은 `sf.getVariableDeclaration('PERMISSIONS')`로, union은 TypeAlias로 접근.

```typescript
export function addPermissions(root: string) {
  withSource(root, R.permissions.file, (sf) => {
    const obj = sf.getVariableDeclaration('PERMISSIONS')
      ?.getInitializerIfKind(SyntaxKind.AsExpression)?.getExpression()
      ?.asKind(SyntaxKind.ObjectLiteralExpression);
    if (obj && !obj.getProperty(R.permissions.key)) {
      obj.addPropertyAssignment({ name: R.permissions.key, initializer: R.permissions.objectLiteral });
    }
    // Permission union 멤버 추가 (TypeAlias 텍스트 편집 — 구현 시 실제 union 형태 확인)
  });
}
export function removePermissions(root: string) {
  withSource(root, R.permissions.file, (sf) => {
    sf.getVariableDeclaration('PERMISSIONS')
      ?.getInitializerIfKind(SyntaxKind.AsExpression)?.getExpression()
      ?.asKind(SyntaxKind.ObjectLiteralExpression)
      ?.getProperty(R.permissions.key)?.remove();
    // union 멤버 제거
  });
}
```

> `PERMISSIONS = {...} as const` 구조라 AsExpression을 거쳐 ObjectLiteral에 접근한다. union 타입 처리는 index.ts의 실제 `Permission` 정의를 보고 텍스트 add/remove로 안전 처리.

- [ ] **Step 4: 검증 (backend 등록만)**

수동으로 `removeBackendRegistration` → `addBackendRegistration`을 1회 실행해보고 `git diff`가 원상복구(no diff)되는지 확인하는 임시 테스트. 멱등·왕복 무결성 1차 검증.

- [ ] **Step 5: Commit**

---

## Task 4: registration — frontend(sidebar) + common 권한 + prisma backref

**Files:** `scripts/module/lib/registration.ts`(확장), `scripts/module/lib/prisma-backref.ts`

- [ ] **Step 1: sidebar NAV_ITEMS + ImageIcon (ts-morph)**

`admin-sidebar.tsx`의 `NAV_ITEMS` 배열에 navItem add/remove + `ImageIcon` named import add/remove. NAV_ITEMS는 `sf.getVariableDeclaration('NAV_ITEMS')`의 ArrayLiteral. icon import는 `@/shared/components/ui/icons` ImportDeclaration.

```typescript
export function addSidebar(root: string) {
  withSource(root, R.sidebar.file, (sf) => {
    ensureImport(sf, R.sidebar.iconName, '@/shared/components/ui/icons');
    const arr = sf.getVariableDeclaration('NAV_ITEMS')?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
    if (arr && !arr.getElements().some((e) => e.getText().includes("'/admin/banners'"))) {
      arr.addElement(R.sidebar.navItem);
    }
  });
}
export function removeSidebar(root: string) {
  withSource(root, R.sidebar.file, (sf) => {
    const arr = sf.getVariableDeclaration('NAV_ITEMS')?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
    arr?.getElements().find((e) => e.getText().includes("'/admin/banners'"))?.remove();
    removeImport(sf, R.sidebar.iconName, '@/shared/components/ui/icons');
  });
}
```

> ImageIcon이 다른 메뉴에서도 쓰이면 removeImport가 과도하다 — `ImageIcon`이 banner 전용인지 확인 후, 공유되면 import 제거는 skip. 구현 시 사용처 검사.

- [ ] **Step 2: common 권한 카탈로그 (ts-morph 또는 텍스트)**

`ALL_PERMISSIONS` 배열에 3개 항목 add/remove. 배열 식별 후 `arr.addElement`/항목 제거.

- [ ] **Step 2b: permission-group.seed.ts — Admin 그룹의 `PERMISSIONS.BANNER.ALL` (ts-morph) ★**

리뷰에서 발견된 숨은 의존. `permission-group.seed.ts`의 Admin 그룹 `permissions` 배열에서 `PERMISSIONS.BANNER.ALL` 항목을 add/remove. **remove 시 이 항목을 `removePermissions`(libs/shared)보다 먼저 제거**해야 컴파일 안 깨짐.

```typescript
export function removePermissionGroupSeed(root: string) {
  withSource(root, R.permissionGroupSeed.file, (sf) => {
    sf.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
      .filter((e) => e.getText() === R.permissionGroupSeed.member)
      .forEach((e) => {
        const el = e.getParentWhileKind(SyntaxKind.ArrayLiteralExpression); // 항목 노드 탐색
        e.getFirstAncestorByKind(SyntaxKind.ArrayLiteralExpression)
          ?.getElements().find((x) => x.getText() === R.permissionGroupSeed.member)?.remove();
      });
  });
}
export function addPermissionGroupSeed(root: string) {
  withSource(root, R.permissionGroupSeed.file, (sf) => {
    // Admin 그룹 permissions 배열을 찾아 멱등 추가. 실제 그룹/배열 식별은 파일 구조 확인 후.
  });
}
```

> 구현 시 permission-group.seed.ts의 실제 구조(어느 그룹의 permissions 배열인지)를 보고 정확히 타겟팅. Admin 그룹만 banner를 가졌는지(Operator 등 다른 그룹도?) 확인.

- [ ] **Step 3: prisma-backref.ts — auth.prisma 텍스트 편집**

`.prisma`는 ts-morph 불가 → 정규식. User 모델 블록 내에 `banners   Banner[]` 라인 add(멱등: 이미 있으면 skip)/remove.

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BANNER_RECIPE as R } from './banner-recipe';

export function addBackref(root: string) {
  const file = path.join(root, R.coreBackref.file);
  let txt = fs.readFileSync(file, 'utf8');
  if (txt.includes(R.coreBackref.field)) return; // 멱등
  // User 모델 블록의 마지막 필드 뒤에 삽입 (model User { ... } 내부)
  txt = txt.replace(/(model User \{[\s\S]*?)(\n\})/, `$1\n  ${R.coreBackref.field}$2`);
  fs.writeFileSync(file, txt);
}
export function removeBackref(root: string) {
  const file = path.join(root, R.coreBackref.file);
  let txt = fs.readFileSync(file, 'utf8');
  txt = txt.replace(new RegExp(`\\n\\s*${R.coreBackref.field.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`), '');
  fs.writeFileSync(file, txt);
}
```

> User 모델 정규식은 auth.prisma 실제 구조를 보고 정밀화. 다른 backref(board의 posts 등)와 위치 충돌 없게.

- [ ] **Step 4: Commit**

---

## Task 5: module:extract — 메인 → catalog 미러

**Files:** `scripts/module/extract.ts`, `package.json`(scripts)

- [ ] **Step 1: extract.ts**

`bannerFeature.footprint`를 읽어 backendDir/frontendDirs/prismaSchema/seeds/routes/feature파일을 `catalog/modules/banner/`로 복사. catalog 내부 구조는 원경로를 보존(복원 매핑 단순화).

```typescript
import { ALL_MANIFESTS } from '../../apps/core-backend/src/features/manifests';
import { copyDir } from './lib/footprint-io';

const ROOT = process.cwd();
const id = process.argv[2] ?? 'banner';
const m = ALL_MANIFESTS.find((x) => x.id === id);
if (!m) throw new Error(`manifest 없음: ${id}`);
const CAT = `catalog/modules/${id}`;
const fp = m.footprint;

// 원경로 보존 미러: catalog/modules/banner/<원래상대경로>
for (const rel of [fp.backendDir, ...(fp.frontendDirs ?? []), ...(fp.routes ?? []), fp.prismaSchema, ...(fp.seeds ?? [])].filter(Boolean) as string[]) {
  copyDir(ROOT, rel, ROOT, `${CAT}/${rel}`);
}
// banner.feature.ts도 별도 복사(footprint 진실)
console.log(`extract 완료: ${CAT}`);
```

> tsx가 manifests.ts(및 banner.feature.ts)를 직접 import하므로 tsconfig-paths 필요할 수 있다. `scripts/module-registry/generate.ts`의 실행 방식(tsx + paths)을 그대로 따른다.

- [ ] **Step 2: package.json scripts**

```json
"module:extract": "tsx scripts/module/extract.ts",
"module:remove": "tsx scripts/module/remove.ts",
"module:add": "tsx scripts/module/add.ts"
```

- [ ] **Step 3: 실행 + 검증**

Run: `pnpm module:extract banner`
Expected: `catalog/modules/banner/` 아래에 backend·frontend·prisma·seed가 원경로 구조로 미러됨. `ls -R catalog/modules/banner | head`로 확인.

- [ ] **Step 4: Commit** (catalog/ 산출물 포함 — 카탈로그를 git에 두는 PoC. degit 원격은 후속)

---

## Task 6: module:remove banner + self-contained 검증 ★

**Files:** `scripts/module/remove.ts`

- [ ] **Step 1: remove.ts**

```typescript
import { ALL_MANIFESTS } from '../../apps/core-backend/src/features/manifests';
import { buildDependencyGraph, analyzeRemoval } from '@weaver2/module-registry';
import { assertCleanWorktree } from './lib/git-guard';
import { removePath } from './lib/footprint-io';
import { removeBackendRegistration, removePermissions, removeSidebar, removeCommonPermissions, removePermissionGroupSeed } from './lib/registration';
import { removeBackref } from './lib/prisma-backref';

const ROOT = process.cwd();
const id = process.argv[2] ?? 'banner';
assertCleanWorktree();

const graph = buildDependencyGraph(ALL_MANIFESTS);
const impact = analyzeRemoval(graph, id);
if (impact.dependents?.length) {
  console.warn('⚠️ 하류 의존:', impact.dependents);  // banner는 [] 기대
}

const fp = ALL_MANIFESTS.find((m) => m.id === id)!.footprint;

// 1) 등록 제거 (파일 삭제 전에)
removePermissionGroupSeed(ROOT);  // ★ PERMISSIONS.BANNER 삭제보다 먼저 (참조 제거)
removeBackendRegistration(ROOT);
removePermissions(ROOT);
removeSidebar(ROOT);
removeCommonPermissions(ROOT);
removeBackref(ROOT);

// 2) footprint 파일 삭제
for (const rel of [fp.backendDir, ...(fp.frontendDirs ?? []), ...(fp.routes ?? []), fp.prismaSchema, ...(fp.seeds ?? [])].filter(Boolean) as string[]) {
  removePath(ROOT, rel);
}

console.log('\\n✅ banner 제거 완료. 다음을 직접 실행하세요:');
console.log('   1) pnpm db:core:migrate --name drop_banner   (banners 테이블 DROP — 데이터 손실)');
console.log('   2) pnpm -w typecheck && pnpm build:core && pnpm build:web');
```

- [ ] **Step 2: 실행**

Run: `pnpm module:remove banner`
Expected: 등록 6곳에서 banner 줄 제거 + features/banner·admin/banners·banner.prisma·seed·route 삭제. `git status`에 삭제/수정 표시.

- [ ] **Step 3: ★ self-contained 검증 (핵심)**

```
grep -ri "banner" apps/*/src libs/*/src | grep -iv "node_modules" 
   → 잔여 0 (또는 무관한 주석만)
pnpm -w typecheck            → 통과 (banner 없어도 컴파일)
pnpm build:core              → nest build 성공
pnpm build:web               → next build 성공
sh scripts/run-test.sh test  → manifest-extract/manifests 등 통과 (banner 빠진 상태로)
```

**이 단계가 PoC의 핵심.** banner가 진짜 self-contained(인바운드 의존 0)라면 제거해도 빌드/테스트가 안 깨진다. 깨지면 어디서 banner를 참조하는지(누락된 inbound 의존) 추적해 footprint/registration을 보강한다.

- [ ] **Step 4: DB migrate (사용자 직접 — 파괴적)**

사용자에게 `pnpm db:core:migrate --name drop_banner` 실행 요청(banners 테이블 DROP, 데이터 손실 확인). 개발 DB라 무방.

- [ ] **Step 5: Commit** — "제거된 상태"는 커밋하지 않고 **검증 후 git restore로 복구**(add 테스트를 위해). 단, 스크립트/유틸 코드 자체는 커밋. 제거 동작 검증 로그만 남긴다.

> 주의: remove는 실제 메인 코드를 지운다. 검증이 끝나면 `git restore .` + `git clean -fd`(catalog 제외 주의)로 banner를 되돌린 뒤 add 테스트로 넘어간다. 또는 remove→add를 연속 실행해 원상복구를 확인한다(Task 7).

---

## Task 7: module:add banner + 왕복 멱등 검증

**Files:** `scripts/module/add.ts`

- [ ] **Step 1: add.ts**

catalog에서 메인으로 복사 + 등록 삽입 + migrate 안내. (remove의 역연산)

```typescript
import { assertCleanWorktree } from './lib/git-guard';
import { copyDir } from './lib/footprint-io';
import { addBackendRegistration, addPermissions, addSidebar, addCommonPermissions, addPermissionGroupSeed } from './lib/registration';
import { addBackref } from './lib/prisma-backref';
import * as fs from 'node:fs';

const ROOT = process.cwd();
const id = process.argv[2] ?? 'banner';
assertCleanWorktree();

const CAT = `catalog/modules/${id}`;
if (!fs.existsSync(`${ROOT}/${CAT}`)) throw new Error(`카탈로그 없음: ${CAT} (먼저 extract)`);

// 1) catalog → 메인 복사 (extract가 원경로 보존했으므로 그대로 복원)
//    catalog/modules/banner/<원경로> → <원경로>
//    (footprint 또는 디렉토리 walk로 복원 경로 산출)

// 2) 등록 삽입
addBackendRegistration(ROOT);
addPermissions(ROOT);          // PERMISSIONS.BANNER 먼저 삽입
addPermissionGroupSeed(ROOT);  // 그 다음 참조(BANNER.ALL) 삽입
addSidebar(ROOT);
addCommonPermissions(ROOT);
addBackref(ROOT);

console.log('\\n✅ banner 설치 완료. 직접 실행: pnpm db:core:migrate --name add_banner');
```

> 복원 경로 산출: extract가 `catalog/modules/banner/<원경로>`로 보존했으므로, catalog 하위를 walk해서 `catalog/modules/banner/` 접두를 떼면 원경로가 된다. footprint를 다시 참조할 필요 없이 디렉토리 구조로 복원 가능.

- [ ] **Step 2: 왕복 검증**

```
# 시작: banner 설치된 깨끗한 상태(커밋됨)
pnpm module:extract banner      # catalog 생성
git add catalog && git commit   # 카탈로그 커밋
pnpm module:remove banner       # 제거
pnpm db:core:migrate --name drop_banner
# → 빌드/테스트 통과 확인 (self-contained)
pnpm module:add banner          # 재설치
pnpm db:core:migrate --name re_add_banner
# → 빌드/테스트 통과 + 관리자 "배너 관리" 메뉴 재등장 + 대시보드 배너 동작
git diff   # add 후 코드가 원래와 일치(등록 멱등) 확인
```

- [ ] **Step 3: 멱등 반복** — `add → remove → add` 2회 반복해도 빌드 통과 + `git diff` 깨끗(등록 줄 중복/누락 없음).

- [ ] **Step 4: Commit**

---

## Self-Review 결과

- **Spec 커버리지:** 스펙(2026-05-31-module-catalog.md) 4절(설치)·6절(제거)·10절(PoC 1~4)을 banner로 구현. extract·remove·add·왕복 멱등·self-contained 검증 모두 태스크화. codegen(5절)은 방식 A(AST 편집)로 대체, glob codegen(B)는 후속.
- **방식 A 결정:** 등록 6곳을 ts-morph로 멱등 편집. B 전환 시 등록 처리만 교체되고 footprint-io/extract/migrate/검증은 재사용.
- **미확정(구현 시 확인):** ① ts-morph로 `@Module` imports 배열 정밀 접근(getDecorator/getProperty) ② Permission union 실제 표현 ③ auth.prisma User 모델 정규식 ④ ImageIcon 공유 여부 ⑤ tsx로 manifests.ts import 시 tsconfig-paths ⑥ catalog walk 복원 경로. 각 Task에 노트.
- **안전:** git-guard로 청결 워킹트리 강제, DB migrate는 사용자 수동, remove 검증 후 복구.

## 다음 단계
- Plan 3 완료(왕복 검증 성공) 후 → 후속: degit 원격 카탈로그 repo, DB 데이터 존재 경고, 대시보드 미설치(유령카드) 표현, 그리고 **방식 B(glob codegen)로 등록 처리 승급**.
