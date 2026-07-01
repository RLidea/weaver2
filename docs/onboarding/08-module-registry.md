# 8. 모듈 레지스트리 (Module Registry)

이 장은 `feat/module-registry` 브랜치의 본체입니다. `catalog/`, `scripts/module/`, `libs/module-registry/`가 처음 보는 사람에게 낯설 수밖에 없는 이유는, 이것들이 weaver2에서 가장 새롭고 가장 독특한 레이어이기 때문입니다. 동시에 **가장 오해하기 쉬운** 레이어이기도 합니다. 이 장은 그 오해를 막는 데 분량을 아끼지 않겠습니다.

---

## 8.1 "모듈"이란 무엇인가 — 그리고 왜 필요한가

1장에서 weaver2를 "이미 다 채워진 집"이라고 했습니다. 게시판·신고·검색·배너가 이미 완성된 채로 들어 있죠. 그런데 새 프로젝트를 분기할 때 "우리 서비스에는 배너가 없어"라고 결정하면 어떻게 해야 할까요?

직관적으로는 "배너 폴더 지우면 되는 거 아닌가?"라고 생각할 수 있습니다. 하지만 weaver2에서 **"기능 하나"는 절대 한 폴더에 모여 있지 않습니다.** 게시판(board)을 예로 들어 보겠습니다.

게시판 기능이 실제로 자리 잡은 곳들:

| 위치 | 내용 |
|------|------|
| `apps/core-backend/src/features/board/` | NestJS 백엔드 모듈 전체 |
| `apps/core-frontend/src/features/board/` | 프론트 컴포넌트·훅·API 클라이언트 |
| `apps/core-frontend/src/features/admin/boards/` | 관리자 화면 |
| `apps/core-backend/prisma/schema/board.prisma` | DB 스키마 (Board/Post/Comment 등 7개 모델) |
| `apps/core-backend/prisma/seed/board-permission.seed.ts` | 권한 시드 |
| `apps/core-frontend/src/app/(protected)/boards` | Next.js 라우트 |
| `apps/core-frontend/src/app/(admin)/admin/boards` | 관리자 라우트 |
| `apps/core-backend/src/core.module.ts` | `@Module({ imports: [..., BoardModule] })` |
| `apps/core-backend/src/system/admin/api/admin-api.module.ts` | `@Module({ imports: [..., BoardModule] })` |
| `libs/shared/src/index.ts` | `PERMISSIONS.BOARD`, `PERMISSIONS.POST`, `PERMISSIONS.COMMENT` 상수 |
| `libs/common/src/constants/permissions.const.ts` | `ALL_PERMISSIONS` 배열 항목들 |
| `apps/core-backend/prisma/seed/permission-group.seed.ts` | Admin 그룹 `PERMISSIONS.BOARD.*` 항목 |
| `apps/core-frontend/src/shared/components/layout/admin-sidebar.tsx` | 사이드바 nav 항목 |

**한 기능이 7~8곳 이상에 흩어져 있습니다.** 폴더를 지우는 것만으로는 NestJS `@Module` 배열, 권한 상수, 사이드바 nav 항목 등이 남아서 컴파일이 깨집니다.

모듈 레지스트리는 이 흩어진 지점들을 **매니페스트(`*.feature.ts`) 하나에 선언해 추적·관리**하는 시스템입니다. 한 문장으로:

> **"하나의 기능을 백엔드·프론트·DB 스키마·시드·권한·라우트에 걸쳐 흩어진 모든 조각까지 묶어서, 통째로 잘라내고 다시 붙일 수 있게 만드는 시스템"**

---

## 8.2 매니페스트 (`*.feature.ts`) — 한 기능의 이력서

각 feature 디렉토리에는 `*.feature.ts` 파일이 있습니다. 예:

- `apps/core-backend/src/features/board/board.feature.ts`
- `apps/core-backend/src/features/banner/banner.feature.ts`
- `apps/core-backend/src/features/abuse-report/abuse-report.feature.ts`
- `apps/core-backend/src/features/search/search.feature.ts`

이것이 해당 모듈의 **매니페스트**입니다. 타입 정의는 `libs/module-registry/src/feature-manifest.type.ts`에 있습니다.

### 8.2.1 `FeatureManifest`의 전체 구조

```typescript
// libs/module-registry/src/feature-manifest.type.ts

export type ModuleLayer = 'core' | 'features' | 'infrastructure' | 'system';
export type DependencyKind = 'hard' | 'soft';

export interface FeatureManifest {
  id: string;           // 고유 id (= 디렉토리명, 예: 'banner')
  layer: ModuleLayer;   // 이 모듈이 속한 계층
  description: string;  // 한 줄 설명
  dependsOn: FeatureDependency[];  // 이 모듈이 의존하는 상류
  footprint: FeatureFootprint;     // 이 모듈이 차지하는 모든 파일·등록 지점
  removalNotes: RemovalNote[];     // 제거 시 영향받는 지점 (역의존 알림)
}
```

### 8.2.2 `dependsOn` — 의존 방향과 강도

게시판 매니페스트의 `dependsOn`:

```typescript
// apps/core-backend/src/features/board/board.feature.ts

dependsOn: [
  { id: 'auth',         kind: 'hard', reason: 'jwt-auth.guard 사용 (인증 가드)' },
  { id: 'permission',   kind: 'hard', reason: 'RequirePermission 데코레이터·PermissionService 직접 사용' },
  { id: 'upload',       kind: 'hard', reason: 'PostFile 첨부 — @weaver2/upload' },
  { id: 'notification', kind: 'soft', reason: "EventEmitter2로 'notification.created' emit (리스너 없으면 무시)" },
],
```

의존 강도(`kind`)의 의미:

- **`hard`**: 직접 import. 의존 모듈이 없으면 컴파일이 깨집니다. board를 제거하면서 `auth`, `permission`, `upload`도 함께 지우면 board 소스가 없으니 상관없지만, board를 유지하면서 `upload`를 지우면 컴파일 실패입니다.
- **`soft`**: 타입·데이터·이벤트 의존. 의존 모듈이 없어도 컴파일은 통과되고 해당 기능만 조용히 꺼집니다. board는 `notification`에 soft 의존이므로, notification 모듈 없이도 빌드는 됩니다 (알림 이벤트만 아무도 듣지 않을 뿐).

배너 매니페스트의 `dependsOn`은 훨씬 단순합니다:

```typescript
// apps/core-backend/src/features/banner/banner.feature.ts (catalog 버전)

dependsOn: [
  { id: 'auth',       kind: 'hard', reason: 'JwtAuthGuard 사용 (관리 컨트롤러 인증)' },
  { id: 'permission', kind: 'hard', reason: 'RequirePermission(BANNER.MANAGE) 데코레이터' },
],
```

배너는 auth와 permission에만 의존합니다. 업로드는 백엔드가 직접 import하지 않고 프론트가 upload API를 호출하므로 `dependsOn`에 없습니다. 이처럼 매니페스트는 **백엔드 코드 분석** 기준으로 작성됩니다.

### 8.2.3 `footprint` — 모듈이 차지하는 모든 지점

`footprint`는 모듈의 **물리적 존재 전체**를 열거합니다. 게시판 매니페스트의 `footprint`:

```typescript
footprint: {
  backendDir: 'apps/core-backend/src/features/board',
  frontendDirs: [
    'apps/core-frontend/src/features/board',
    'apps/core-frontend/src/features/admin/boards',
  ],
  prismaSchema: 'apps/core-backend/prisma/schema/board.prisma',
  prismaModels: [
    'Board', 'Post', 'Comment', 'PostCategory', 'Emoji', 'PostReaction', 'PostFile',
  ],
  coreBackrefs: ['User.posts', 'User.comments', 'User.reactions', 'User.files'],
  permissions: ['PERMISSIONS.BOARD', 'PERMISSIONS.COMMENT', 'PERMISSIONS.POST'],
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
}
```

각 필드의 역할:

| 필드 | 설명 |
|------|------|
| `backendDir` | 백엔드 모듈 디렉토리 — extract/remove 시 통째로 대상 |
| `frontendDirs` | 프론트 디렉토리들 — feature + admin 등 여러 곳 |
| `prismaSchema` | 분할된 Prisma 스키마 파일 |
| `prismaModels` | 이 모듈이 소유한 Prisma 모델명 목록 |
| `coreBackrefs` | core 모델(예: User)에 생긴 역참조 relation 필드 — 제거 시 정리 필요 |
| `permissions` | 이 모듈이 사용하는 권한 상수 키 |
| `seeds` | 이 모듈 전용 시드 파일 |
| `routes` | Next.js 라우트 경로 |
| `pinpoints` | 흩어진 인라인 등록 지점 (파일경로 → 식별자) |

`pinpoints`가 핵심입니다. **디렉토리를 통째로 지운다고 기능이 완전히 사라지지 않습니다.** `core.module.ts`의 `imports` 배열, `libs/shared`의 권한 상수, 시드 파일의 권한 항목, 사이드바 nav 항목 — 이것들은 다른 파일 안에 인라인으로 박혀 있어서 별도로 편집해야 합니다. `pinpoints`는 그 "흩어진 인라인 등록 지점들"의 위치 지도입니다.

### 8.2.4 `removalNotes` — 역의존 알림

게시판 매니페스트의 `removalNotes`:

```typescript
removalNotes: [
  {
    severity: 'hard',
    location: 'apps/core-backend/src/features/abuse-report/services/moderation.service.ts',
    note: 'board의 DeletePost/HidePost/HideComment 커맨드를 직접 import·호출. 제거 시 컴파일 실패 → 게시판 신고 처리 로직 분리 필요.',
  },
  {
    severity: 'soft',
    location: 'apps/core-backend/src/features/search',
    note: 'Post/Comment 인덱싱. board 없으면 검색 결과만 비고 컴파일 정상.',
  },
  {
    severity: 'soft',
    location: 'apps/core-backend/src/system/admin/api/services/admin-dashboard.api.service.ts',
    note: 'Post/Comment count 통계. board 없으면 0으로 표시.',
  },
],
```

`severity: 'hard'`는 board를 지우기 전에 **반드시 수동으로 처리해야 하는** 지점입니다. `abuse-report`의 `moderation.service.ts`가 board 커맨드를 직접 import하므로, board를 제거하면 abuse-report 컴파일이 깨집니다. `severity: 'soft'`는 기능이 조용히 꺼지거나 빈 결과를 내는 것이므로, 허용하거나 별도 처리할 수 있습니다.

---

## 8.3 현재 등록된 4개 모듈

중앙 목록 파일 `apps/core-backend/src/features/manifests.ts`:

```typescript
import type { FeatureManifest } from '@weaver2/module-registry';
import { boardFeature } from './board/board.feature';
import { abuseReportFeature } from './abuse-report/abuse-report.feature';
import { searchFeature } from './search/search.feature';
import { bannerFeature } from './banner/banner.feature';

export const ALL_MANIFESTS: FeatureManifest[] = [
  boardFeature,
  abuseReportFeature,
  searchFeature,
  bannerFeature,
];
```

4개 모두 `*.feature.ts`가 있고, `dependsOn`과 `footprint`가 채워져 있습니다. 매니페스트 타입과 이후 소개할 의존성 추출기·그래프 도구는 이 4개에 대해 **실제로 적용된 도구**입니다.

---

## 8.4 의존성 추출기 (`extract-manifest.ts`)

매니페스트는 사람이 직접 작성하지만, `dependsOn`의 초안은 정적분석으로 자동 추출할 수 있습니다.

`libs/module-registry/src/extract-manifest.ts`는 ts-morph를 사용해 다음을 수행합니다:

**1단계 — 소스 파일 수집**

feature 디렉토리(`apps/core-backend/src/features/<id>/`)의 `.ts` 파일 전체를 읽습니다. `.spec.ts`와 `.feature.ts`는 제외합니다.

**2단계 — import 순회**

각 `import` 선언을 순회해 의존 모듈 id를 두 방법으로 판정합니다.

- **Known 모듈 매핑** (`libs/module-registry/src/known-modules.ts`): 정규식 기반. 예:
  - `/core/permission/` 경로를 import하면 → id `'permission'`
  - `@weaver2/upload`를 import하면 → id `'upload'`
  - `/core/notification/` → `'notification'`, `/core/auth/` → `'auth'`

- **상대경로 feature 의존 감지**: `./` 또는 `../` 상대경로의 실제 파일 경로에서 `/features/<other-id>/` 패턴을 추출합니다. 추출 대상 feature 자신은 제외하고 다른 feature이면 의존으로 잡습니다.

**3단계 — kind 휴리스틱**

- `import type`이면 → soft (타입만 쓰므로 런타임 의존 없음)
- 값 import이고 dto/event 경로가 아니면 → hard
- dto 경로(`/dto/`)이거나 event 파일명(문자열 `-event` 포함)이면 → soft
- 같은 모듈에서 여러 번 import 시 하나라도 hard이면 hard로 머지

**4단계 — prisma 스키마 파싱**

`apps/core-backend/prisma/schema/<featureId>.prisma`가 있으면 `model <Name> {` 패턴으로 모델명을 추출합니다.

**5단계 — 권한 상수 수집**

전체 소스 텍스트에서 `PERMISSIONS.<X>` 패턴을 모아 중복 제거 후 정렬합니다.

```typescript
// 사용 예 (scripts/module/extract.ts 내부에서 호출)
import { extractManifest } from '@weaver2/module-registry';
const extracted = extractManifest('banner');
// extracted.dependsOn, extracted.footprint.permissions 등을 확인
```

**추출기의 한계**: `kind` 판정은 휴리스틱입니다. 코드 주석 원문: *"확신은 사람이 한다 (verify는 kind를 warn으로만 처리)"*. `-event` 부분 문자열 매칭은 과대매칭 가능성이 있고, 같은 모듈에서 service와 dto를 함께 import하면 soft 의존이 hard로 올라갑니다. **추출 결과는 초안이고, 최종 매니페스트는 사람이 검토·확정합니다.**

---

## 8.5 의존성 그래프 (`build-graph.ts`)

`libs/module-registry/src/build-graph.ts`는 `ALL_MANIFESTS`로부터 방향 그래프를 빌드하고 세 가지 분석을 제공합니다.

### `buildDependencyGraph(manifests)`

```typescript
function buildDependencyGraph(manifests: FeatureManifest[]): DependencyGraph
```

`FeatureManifest[]`를 받아 `DependencyGraph`를 반환합니다:

```typescript
// libs/module-registry/src/dependency-graph.type.ts

interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  dependencies: Record<string, string[]>;  // id → 직접 의존하는 상류 목록
  dependents: Record<string, string[]>;    // id → 이 모듈에 의존하는 하류 목록 (계산됨)
}

interface GraphEdge {
  from: string;  // 의존하는 쪽 (하류)
  to: string;    // 의존받는 쪽 (상류)
  kind: DependencyKind;
}
```

`dependencies`는 `dependsOn`에서 읽어오고, `dependents`는 역방향으로 계산합니다. 그래프에는 매니페스트가 없는 core 모듈(`permission`, `auth` 등)도 포함될 수 있습니다 (비대칭 허용, 의도된 설계).

### `analyzeRemoval(graph, targetId)`

특정 모듈을 제거할 때의 영향을 BFS로 계산합니다:

```typescript
function analyzeRemoval(graph: DependencyGraph, targetId: string): RemovalImpact
```

```typescript
interface RemovalImpact {
  target: string;
  affectedDependents: string[];   // 직·간접 영향받는 하류 전체
  hardBlockers: GraphEdge[];      // 끊어야 하는 hard 역의존 (수동 처리 필요)
  softDegradations: GraphEdge[];  // 자연 비활성되는 soft 역의존 (허용 가능)
}
```

`remove.ts`가 실제로 이 함수를 호출해 제거 전에 하류 의존을 경고합니다. banner는 아무 모듈도 banner에 의존하지 않으므로 `affectedDependents: []`, self-contained로 판정됩니다. 반면 board를 제거하려 하면 `abuse-report`가 `hardBlockers`에 나타납니다.

### `findCycles(graph)`

DFS(깊이우선탐색) 기반 사이클 탐지. GRAY(방문 중) / BLACK(방문 완료) 컬러링으로 역방향 엣지를 찾습니다. 매니페스트가 없는 core 모듈(`auth`, `permission` 등)은 `nodes`에 없으므로 `known set`으로 필터링해 무시합니다.

### 현재 그래프의 실제 모양 — 별(star) 구조

4개 feature 모듈의 의존 구조:

```
board        → auth (hard), permission (hard), upload (hard), notification (soft)
abuse-report → auth (hard), permission (hard), board (hard)
search       → auth (hard), permission (hard), board (soft)
banner       → auth (hard), permission (hard)
```

feature 간 교차 의존은 `abuse-report → board`(hard)와 `search → board`(soft) 두 개뿐입니다. 나머지는 모두 core 방향 의존입니다. **중심이 board인 별 모양(star graph)**에 가깝습니다.

이 구조에서는 `findCycles`는 빈 배열을 반환하고, `analyzeRemoval`은 banner와 search의 경우 빈 하류를 반환합니다. **그래프 알고리즘 자체는 올바르게 구현돼 있지만, 현재 4모듈 규모에서는 알고리즘의 진가를 발휘할 기회가 없습니다.** 모듈이 10~20개로 늘어나고 교차 의존이 복잡해질 때 이 도구가 의미 있게 됩니다. 현재 규모에서 그래프 알고리즘을 도입한 것은 **과조숙(premature)**임을 인정해야 합니다.

---

## 8.6 라이프사이클 스크립트 — extract / add / remove

`package.json`에는 세 개의 모듈 관리 스크립트가 등록돼 있습니다:

```bash
pnpm module:extract banner   # 메인 코드베이스 → catalog 스냅샷 저장
pnpm module:add banner       # catalog → 메인 코드베이스 복원 + 등록 삽입
pnpm module:remove banner    # 메인 코드베이스에서 제거 + 등록 해제
```

각각 `scripts/module/extract.ts`, `add.ts`, `remove.ts`가 실행됩니다.

### `module:extract` — 스냅샷 저장 (`scripts/module/extract.ts`)

`remove` 전에 먼저 실행해 현재 상태를 카탈로그에 저장합니다:

1. `ALL_MANIFESTS`에서 id로 매니페스트를 찾습니다
2. `footprint`의 `backendDir`, `frontendDirs`, `routes`, `prismaSchema`, `seeds` 경로들을 `catalog/modules/<id>/<원래 상대경로>` 구조로 **원경로 보존 미러 복사**합니다
3. 메인 코드베이스 파일을 건드리지 않으므로 git-guard 불필요, 멱등

결과: `catalog/modules/banner/` 아래 banner의 모든 파일이 원경로 구조 그대로 저장됩니다. `add`는 이 구조를 그대로 읽어 복원하므로 별도의 경로 매핑이 필요 없습니다.

### `module:remove` — 제거 (`scripts/module/remove.ts`)

```
0) assertCleanWorktree     — git 워킹트리 청결 확인 (파일을 실제 삭제하므로 필수)
1) analyzeRemoval          — 하류 의존 경고 (hard blocker 있으면 명시)
2) 등록 제거               — footprint 파일 삭제보다 반드시 먼저
   ★ removePermissionGroupSeed  (PERMISSIONS.BANNER 삭제 전에 참조 끊기)
   → removeBackendRegistration  (core.module.ts, admin-api.module.ts, manifests.ts)
   → removePermissions          (libs/shared/src/index.ts)
   → removeSidebar              (admin-sidebar.tsx)
   → removeCommonPermissions    (permissions.const.ts)
   → removeBackref              (auth.prisma User.banners 역참조)
3) footprint 파일 삭제     — backendDir, frontendDirs, routes, seeds, prismaSchema
4) gen-slot-registry.ts 재실행  — 슬롯 레지스트리 업데이트
5) migrate 안내 출력       — DB는 사용자가 직접 실행
```

순서가 중요합니다. `removePermissionGroupSeed`를 `removePermissions`보다 먼저 실행하는 이유: `permission-group.seed.ts`가 `PERMISSIONS.BANNER.ALL`을 참조하는데, `libs/shared`에서 `PERMISSIONS.BANNER`를 먼저 삭제하면 시드 파일의 참조가 끊겨 TypeScript 컴파일 오류가 발생합니다. 참조하는 쪽(시드)을 먼저 정리한 뒤 참조 대상(shared 상수)을 제거해야 self-contained 상태가 유지됩니다.

DB는 스크립트가 직접 건드리지 않습니다. 제거 완료 후 사용자가 직접:
```bash
pnpm db:core:generate                    # banner.prisma 삭제 반영 (Banner 타입 제거)
pnpm db:core:migrate --name drop_banner  # banners 테이블 DROP (데이터 영구 삭제)
```

### `module:add` — 복원 (`scripts/module/add.ts`)

`remove`의 역연산:

```
1) catalog/modules/<id>/ walk → 메인 코드베이스 원경로 복원 (멱등)
2) 등록 삽입
   addPermissions          (PERMISSIONS.BANNER 먼저 삽입)
   → addPermissionGroupSeed  (PERMISSIONS.BANNER.ALL 참조가 그 다음)
   → addBackendRegistration  (core.module.ts, admin-api.module.ts, manifests.ts)
   → addSidebar              (admin-sidebar.tsx)
   → addCommonPermissions    (permissions.const.ts)
   → addBackref              (auth.prisma User.banners)
3) gen-slot-registry.ts 재실행
4) migrate 안내 출력
```

`add`에는 git-guard가 없습니다. `remove` 직후(banner가 삭제된 더러운 트리)에서 복원하는 것이 정상 시나리오이고, 복사와 등록이 멱등이기 때문입니다. 실수 방지는 `remove` 쪽의 git-guard가 담당합니다.

### ts-morph 자동편집과 앵커 치환의 위험

`scripts/module/lib/registration.ts`의 등록/해제 로직은 두 방식을 혼용합니다.

**방식 A — ts-morph AST 조작**: NestJS `@Module({ imports: [...] })` 배열에 항목을 추가/제거하고 import 선언을 삽입/삭제합니다. AST를 직접 다루므로 공백·들여쓰기가 다소 달라도 동작합니다.

**방식 B — 텍스트 직접 치환 (앵커 기반)**: `libs/shared/src/index.ts`(PERMISSIONS 객체), `admin-sidebar.tsx`(NAV_ITEMS), `permissions.const.ts`, `permission-group.seed.ts`는 텍스트 치환으로 처리합니다. 예:

```typescript
// registration.ts 중 addPermissions 일부
const boardBlockEnd = `    ALL: 'board:*',\n  },\n`;
if (!txt.includes('BANNER:')) {
  if (txt.includes(boardBlockEnd)) {
    txt = txt.replace(boardBlockEnd, `${boardBlockEnd}${BANNER_PERMISSIONS_BLOCK}`);
  } else {
    console.warn('[banner] shared/index.ts PERMISSIONS 객체: 앵커를 찾지 못해 등록을 건너뜀 — 수동 확인 필요');
  }
}
```

앵커 텍스트(`boardBlockEnd`)가 리포맷·수동편집으로 달라지면 `console.warn`만 출력하고 **조용히 skip**합니다. 성공과 skip이 프로세스 종료 코드로 구분되지 않으므로 — 스크립트가 "완료"로 끝났어도 일부 지점이 실제로 편집되지 않았을 수 있습니다.

> ⚠️ **`module:add` / `module:remove` 실행 후 반드시 빌드로 컴파일을 확인하세요** — 백엔드 `pnpm build:core`, 프론트 `pnpm build:web`. 앵커가 맞지 않아 skip된 지점이 있으면 TypeScript 컴파일 오류로 드러납니다. *(weaver2에는 별도 `typecheck` 스크립트가 없습니다.)*

---

## 8.7 슬롯 레지스트리 (`gen-slot-registry.ts`)

2장에서 `pnpm dev:web`이 `gen:slots`를 먼저 실행한다고 했습니다. 그 스크립트가 `scripts/gen-slot-registry.ts`입니다.

### 왜 필요한가

banner 모듈은 `dashboard-slots.tsx`를 갖습니다:
`apps/core-frontend/src/features/banner/dashboard-slots.tsx`

이 파일은 "이 모듈이 특정 슬롯에 노출할 React 컴포넌트"를 export합니다. **슬롯**은 현재 두 종류입니다:

- `'dashboard-top'` — 대시보드 상단에 주입되는 컴포넌트
- `'global-popup'` — 전역 팝업 (배너 팝업 등)

문제는 "어떤 모듈이 현재 설치돼 있는가?"를 프론트가 알아야 한다는 것입니다. banner가 `remove`로 제거되면 슬롯에서도 빠져야 하고, `add`로 복원되면 다시 나타나야 합니다. 이를 정적 import로 처리하면 모듈 제거 시 import가 깨집니다.

### 동작 원리

`gen-slot-registry.ts`는 `apps/core-frontend/src/features/` 하위의 **모든 `dashboard-slots.tsx` 파일을 글롭**합니다. 해당 파일이 존재하는 디렉토리 = 설치된 모듈로 간주합니다. 그 결과로 `slot-registry.generated.ts`를 생성합니다:

```typescript
// apps/core-frontend/src/shared/components/slot-registry.generated.ts
// AUTO-GENERATED by scripts/gen-slot-registry.ts — DO NOT EDIT

export const SLOT_REGISTRY: Record<SlotName, SlotEntry[]> = {
  'dashboard-top': [bannerSlots['dashboard-top']].filter(Boolean) as SlotEntry[],
  'global-popup':  [bannerSlots['global-popup']].filter(Boolean)  as SlotEntry[],
};
```

banner가 제거되면 `dashboard-slots.tsx`도 삭제되고, 레지스트리를 재생성하면 자동으로 빈 배열이 됩니다. banner가 복원되면 다시 채워집니다. `module:add`와 `module:remove` 모두 마지막에 자동으로 이 스크립트를 실행합니다.

`gen-slot-registry.ts`는 **범용입니다.** 새 모듈이 `dashboard-slots.tsx`를 가지면 추가 설정 없이 자동 감지됩니다.

---

## 8.8 현재 상태와 한계 — 정직하게 둘로 가른다

CHARTER.md §8은 module-registry를 명시적으로 둘로 나눕니다. 코드를 직접 읽고 나면 그 평가가 정확하다는 것을 확인할 수 있습니다.

### ✅ 합리적 절반 — 실제로 작동하는 범용 도구

| 컴포넌트 | 파일 | 실제 적용 범위 |
|---------|------|-------------|
| `FeatureManifest` 타입 | `libs/module-registry/src/feature-manifest.type.ts` | board/abuse-report/search/banner 4개 |
| `extract-manifest.ts` | `libs/module-registry/src/extract-manifest.ts` | 4개 모두에 대해 의존 추출 가능 |
| `build-graph.ts` | `libs/module-registry/src/build-graph.ts` | 4개 모두에 적용. 알고리즘은 정확 |
| `gen-slot-registry.ts` | `scripts/gen-slot-registry.ts` | 슬롯 파일 자동 감지, 완전 범용 |
| `ALL_MANIFESTS` 목록 | `apps/core-backend/src/features/manifests.ts` | 4개 등록 |

이 도구들은 새 모듈의 `*.feature.ts`를 작성하고 `ALL_MANIFESTS`에 등록하면 **추가 코드 변경 없이** 그래프 분석과 슬롯 감지가 동작합니다. 이 절반은 진짜 범용입니다.

### ❌ 과도한 절반 — banner 전용 하드코딩

`scripts/module/lib/registration.ts` (471줄)의 모든 add/remove 함수 상단:

```typescript
// registration.ts 첫 줄
import { BANNER_RECIPE as R } from './banner-recipe';
```

`scripts/module/lib/banner-recipe.ts`는 `BANNER_RECIPE`라는 상수 하나를 export합니다. `registration.ts`의 모든 편집 함수는 이 상수에서 파일 경로, 앵커 텍스트, 마커를 가져옵니다. **id를 매개변수로 받지 않습니다.**

`add.ts`와 `remove.ts`는 `process.argv[2] ?? 'banner'`로 id를 받지만:

- `remove.ts`는 id를 이용해 `ALL_MANIFESTS`에서 매니페스트를 찾아 **footprint 파일 삭제**는 id 기반으로 정확히 동작합니다.
- 그러나 등록 해제(`removeBackendRegistration`, `removePermissions` 등)는 내부에서 `R`(= `BANNER_RECIPE`)을 참조하므로 banner 외 다른 id를 넘겨도 `BannerModule`, `PERMISSIONS.BANNER` 등을 찾아 편집합니다.

따라서 `pnpm module:remove search`를 실행하면:
- search의 `backendDir`/`frontendDirs`/`routes`는 올바르게 삭제됩니다.
- 등록 해제 단계에서는 `search`를 위한 편집이 아니라 `BannerModule`과 `bannerFeature`를 파일에서 찾아 제거하려 시도합니다.
- search와 banner가 모두 설치돼 있으면, 엉뚱하게 banner 등록이 해제됩니다.
- search와 banner 모두 없으면, 앵커 탐색 실패 warn만 출력합니다.

**두 번째 모듈(board/search/abuse-report)은 코드 재작성 없이 `add`/`remove` 전 과정이 불가능합니다.**

`catalog/` 디렉토리도 현재 `banner/`만 존재합니다. `module:extract`를 board에 대해 실행하면 catalog가 생기겠지만, `module:add`와 `module:remove`의 등록 편집은 banner 전용입니다.

#### 명명과 실체의 괴리

| 이름 | 실체 |
|-----|------|
| `@weaver2/module-registry` (라이브러리 패키지명) | 타입 + 그래프 알고리즘 + 추출기. 이 자체는 범용이고 합리적 |
| `catalog/` | banner 파일 미러 단 1개 |
| `scripts/module/lib/registration.ts` | "범용 등록기"처럼 보이지만 banner 전용 |
| `pnpm module:add <id>` / `pnpm module:remove <id>` | `id`를 받는 것처럼 보이지만 banner에만 완전히 동작 |
| "catalog" (디렉토리명) | banner 하나짜리 미러 저장소 |
| `generate.ts` (CHARTER §8 언급) | 24줄 JSON 프린터. UI 대시보드가 따로 없음 |

### 왜 이렇게 됐는가 — §5.1 Rule of Three

CHARTER §5.1의 "증거 기반" 렌즈로 보면 이 상태는 의도된 선택입니다.

banner 1례를 실제로 구현하면서 "모듈 제거 가능성"을 검증했습니다. 핵심 질문: *"한 기능이 7~8곳에 흩어져 있는 weaver2에서 통째로 잘라내고 붙이는 것이 가능한가?"* — 이 가능성을 banner로 증명했습니다. **두 번째 모듈이 생기기 전에 범용화하는 것은 §5.1 Rule of Three에 위배됩니다.** 1례로 패턴을 추상화하면 아직 만나지 않은 요구에 대한 상상 기반 일반화가 됩니다.

이것은 버그가 아니라 **의도된 미완성**입니다. ROADMAP "OSS 공개를 위한 준비" ④에 범용화가 명시돼 있습니다. **범용 add/remove는 두 번째 실제 모듈을 분리할 요구가 끌어당길 때(pull) 그때 만듭니다.**

### 신규자를 위한 실용 결론

> 지금 weaver2에 합류했다면, module-registry에 대해 다음만 기억하면 됩니다:
>
> 1. **매니페스트(`*.feature.ts`)는 읽어야 합니다** — 기능의 풋프린트와 의존성을 이해하는 가장 빠른 지도입니다. 새 기능을 추가할 때 이 파일부터 작성하세요.
> 2. **`pnpm module:remove banner` (그리고 `add banner`)는 실제로 쓸 수 있습니다** — banner가 필요 없는 프로젝트 분기에서 사용하는 용도입니다.
> 3. **`pnpm module:remove board` 등은 현재 반쪽만 동작합니다** — footprint 파일 삭제는 되지만 등록 해제 편집은 banner 전용입니다. 나머지 지점(`pinpoints`)은 수동으로 처리해야 합니다.
> 4. **`gen-slot-registry.ts`는 완전 범용입니다** — 새 모듈이 `dashboard-slots.tsx`를 갖추면 자동 감지됩니다.
> 5. **`extract-manifest.ts`는 완전 범용입니다** — 새 feature 디렉토리에 대해 `extractManifest('my-feature')`를 호출하면 의존성 초안을 뽑을 수 있습니다.

---

## 8.9 관련 파일 빠른 참조

| 파일 | 역할 |
|-----|------|
| `libs/module-registry/src/feature-manifest.type.ts` | 매니페스트 타입 정의 (`FeatureManifest`, `FeatureFootprint`, `RemovalNote` 등) |
| `libs/module-registry/src/extract-manifest.ts` | ts-morph 기반 의존성 자동 추출기 (범용) |
| `libs/module-registry/src/build-graph.ts` | `buildDependencyGraph`, `analyzeRemoval`, `findCycles` |
| `libs/module-registry/src/known-modules.ts` | import 경로 → 모듈 id 정규식 매핑 (`KNOWN_MODULES`) |
| `libs/module-registry/src/dependency-graph.type.ts` | `DependencyGraph`, `RemovalImpact` 타입 |
| `apps/core-backend/src/features/manifests.ts` | `ALL_MANIFESTS` 배열 (4개 등록) |
| `apps/core-backend/src/features/*/\*.feature.ts` | 각 모듈 매니페스트 (board/abuse-report/search/banner) |
| `scripts/module/extract.ts` | `pnpm module:extract` 진입점 |
| `scripts/module/add.ts` | `pnpm module:add` 진입점 |
| `scripts/module/remove.ts` | `pnpm module:remove` 진입점 |
| `scripts/module/lib/registration.ts` | 등록/해제 편집 함수 (banner 전용 — 471줄) |
| `scripts/module/lib/banner-recipe.ts` | banner 파일 경로·앵커·마커 상수 |
| `scripts/module/lib/git-guard.ts` | `assertCleanWorktree` (remove 전 청결 확인) |
| `scripts/module/lib/footprint-io.ts` | `copyDir`, `removePath` (파일 복사/삭제 유틸) |
| `scripts/module/lib/prisma-backref.ts` | `addBackref`, `removeBackref` (User 역참조 편집) |
| `scripts/gen-slot-registry.ts` | 슬롯 레지스트리 생성기 (범용) |
| `apps/core-frontend/src/shared/components/slot-registry.generated.ts` | 생성된 슬롯 레지스트리 (커밋 대상, `dev:web`이 재생성) |
| `catalog/modules/banner/` | banner 파일 미러 (현재 유일한 카탈로그 항목) |

---

→ **[9장 실전 가이드 (Recipes)](09-recipes.md)**
