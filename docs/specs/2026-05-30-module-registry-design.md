# Module Registry — 0단계 설계 (매니페스트 토대)

> 작성일: 2026-05-30
> 상태: 설계 합의 완료, 구현 대기
> 성격: 살아있는 설계 문서 (시점 기록 아님 — 결정이 바뀌면 갱신)

---

## 1. 배경과 큰 그림

### 1.1 비전 — "본인용 모듈 레지스트리 + 조립식 앱 베이스"

`weaver2`는 NestJS + Next.js 보일러플레이트다 (CHARTER로 정체성 명문화, **본인용 fork 모델**).
이 문서는 weaver2를 다음 방향으로 진화시키기 위한 **첫 단추**다:

- **목적1 (재사용 가속)**: 한 번 만든 기능 모듈(게시판·쇼핑몰 등)을 카탈로그에 축적해, 차기 프로젝트에서 골라 조립함으로써 개발을 가속한다.
- **목적2 (도메인 중립화)**: "커뮤니티 플랫폼 전용"에서 벗어나, 어떤 앱이든 조립 가능한 베이스로 만든다. (CHARTER §1 확장 결정)

> **핵심 제약**: '본인용'이라는 정체성은 유지한다. 제3자 플러그인 생태계나 런타임 동적 로딩이 **아니다**.
> 조립은 **빌드/개발 타임**에 일어나므로 fork 모델, Prisma(단일 마이그레이션), Next.js(빌드타임 라우트)의 본질과 충돌하지 않는다.

### 1.2 4 구성요소

| # | 구성요소 | 설명 |
|---|---|---|
| ① | 모듈 카탈로그 | 재사용 모듈들이 표준 형태(매니페스트)로 축적 |
| ② | 의존성 그래프 | 모듈 간 "무엇이 무엇을 필요로 하나" |
| ③ | 설치/제거 | CLI 또는 대시보드 액션 (빌드타임) |
| ④ | 가시성 대시보드 | 개발자 로그인 시 "현재 깔린 모듈 + 구조" 표시 (읽기 전용으로도 충분) |

### 1.3 5 단계 로드맵

```
0단계 [토대]    매니페스트 표준 + 의존 그래프 데이터   ← 이 문서
1단계 [가시성]  의존성/모듈 대시보드 (읽기 전용)        ← ROI 1순위 (①②④ 소비)
2단계 [조립]    설치/제거 CLI                          ← ③
3단계 [축적]    board 외 재사용 모듈(shop 등) 표준화    ← 목적1 본격화
( 병행 트랙: 목적2 = core 도메인 중립화 — 가장 깊고 느림. "의식만, 나중에" )
```

**0단계가 모든 것의 토대다.** 매니페스트와 의존 그래프가 데이터로 서 있어야 1·2·3단계가 그것을 소비한다.

---

## 2. 0단계 목표와 비범위

### 2.1 목표

각 기능 모듈이 코드베이스에 남기는 **발자국(footprint)**과 **의존 관계**를, 기계가 읽을 수 있는 **선언적 매니페스트**로 응집한다. 그 매니페스트들로부터 의존 그래프를 계산하는 순수 함수를 제공한다.

한 줄 요약: **흩어진 분기 지식 → 매니페스트 1개로 압축.** (CHARTER §9의 수작업 체크리스트를 데이터화)

### 2.2 비범위 (명시적으로 안 함)

- ❌ 대시보드 UI (1단계)
- ❌ 설치/제거 CLI (2단계)
- ❌ board 외 신규 모듈 (3단계)
- ❌ core 도메인 중립화 (목적2, 별도 트랙)
- ❌ **기존 코드의 런타임 동작 변경** — 매니페스트는 "지식의 응집"일 뿐, 동작은 지금과 100% 동일하다. 위험도 그만큼 낮다.

### 2.3 수준

순수 문서화(A)와 독립 시스템(B) 사이의 **A+**: 기계가 읽을 수 있는 매니페스트 + 작은 그래프 빌더. ESLint 아키텍처 가드 같은 강제 장치는 0단계 범위 밖(필요 시 후속).

---

## 3. 설계

### 3.1 디렉토리 구조

```
libs/module-registry/                ← 신설 lib (@weaver2/module-registry)
  src/
    feature-manifest.type.ts         ← 매니페스트 타입 정의
    dependency-graph.type.ts         ← 그래프 타입 정의
    build-graph.ts                   ← buildDependencyGraph(), analyzeRemoval()
    index.ts                         ← 공개 API + 매니페스트 수집
  README.md

apps/core-backend/src/features/board/board.feature.ts                ← co-located 매니페스트
apps/core-backend/src/features/abuse-report/abuse-report.feature.ts
apps/core-backend/src/features/search/search.feature.ts
```

- 타입·빌더는 백·프론트 공용이므로 `libs/`에 둔다 (`@weaver2/module-registry`, tsconfig paths 등록).
- **매니페스트는 각 feature 폴더에 co-locate** — board를 보면 board의 발자국이 바로 옆에 있어, "6개월 뒤 안 헷갈린다"는 CHARTER 원칙에 부합.

### 3.2 `FeatureManifest` 타입

```ts
// libs/module-registry/src/feature-manifest.type.ts

export type ModuleLayer = 'core' | 'features' | 'infrastructure' | 'system';
export type DependencyKind = 'hard' | 'soft';

export interface FeatureDependency {
  /** 의존 대상 모듈 id (다른 매니페스트의 id 또는 알려진 core 모듈) */
  id: string;
  /**
   * hard: 직접 import — 대상이 없으면 컴파일 실패 (반드시 처리)
   * soft: 타입·데이터·이벤트 — 없어도 컴파일 OK (graceful degradation)
   */
  kind: DependencyKind;
  /** 왜 의존하는지 (사람이 읽는 메모) */
  reason?: string;
}

export interface FeatureFootprint {
  /** 백엔드 모듈 디렉토리 (통째 삭제 대상) */
  backendDir?: string;
  /** 프론트 디렉토리들 (feature + admin 등 여러 곳일 수 있음) */
  frontendDirs?: string[];
  /** 분할된 Prisma 스키마 파일 */
  prismaSchema?: string;
  /** 이 모듈이 소유한 Prisma 모델명 (분기 시 제거 대상) */
  prismaModels?: string[];
  /** core 모델에 생긴 역참조 relation 필드 (제거 시 정리 — 무결성과 무관, syntactic sugar) */
  coreBackrefs?: string[];
  /** 권한 상수 키 (예: 'PERMISSIONS.BOARD') */
  permissions?: string;
  /** 시드 파일들 */
  seeds?: string[];
  /** Next.js 라우트 경로들 */
  routes?: string[];
  /**
   * 흩어진 핀포인트 등록 지점. "파일경로 → 식별자" 형태.
   * 예: 'apps/core-backend/src/core.module.ts → BoardModule'
   */
  pinpoints?: string[];
}

export interface RemovalNote {
  /** hard: 🔴 컴파일/기능이 깨짐 (수작업 필요) / soft: 🟢 자연 비활성 */
  severity: DependencyKind;
  /** 어디서 */
  location: string;
  /** 무엇을 */
  note: string;
}

export interface FeatureManifest {
  /** 고유 id (= 디렉토리명) */
  id: string;
  layer: ModuleLayer;
  /** 한 줄 설명 */
  description: string;
  /** 이 모듈이 의존하는 상류 (역의존은 그래프가 자동 계산) */
  dependsOn: FeatureDependency[];
  footprint: FeatureFootprint;
  /** 이 모듈 제거 시 영향받는 지점 (역의존이 만드는 경고) */
  removalNotes: RemovalNote[];
}
```

**설계 의도**
- **TS 객체** (JSON 아님): 권한 상수 등 실제 심볼 참조 가능, `FeatureManifest` 타입으로 누락을 컴파일 타임에 잡음.
- **의존은 상류 방향만 선언**: 역의존(dependents)은 그래프 빌더가 계산 → 진실의 원천이 하나, 양방향 수동 관리 불필요.
- **hard/soft 강도 구분**이 핵심: 제거 시 "반드시 손볼 곳"과 "알아서 비활성될 곳"을 분리.

### 3.3 의존 그래프 타입

```ts
// libs/module-registry/src/dependency-graph.type.ts

export interface GraphNode {
  id: string;
  layer: ModuleLayer;
  description: string;
}

export interface GraphEdge {
  /** 의존하는 쪽 (하류) */
  from: string;
  /** 의존받는 쪽 (상류) */
  to: string;
  kind: DependencyKind;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** id → 직접 의존하는 상류 목록 */
  dependencies: Record<string, string[]>;
  /** id → 이 모듈에 의존하는 하류 목록 (계산됨) */
  dependents: Record<string, string[]>;
}

export interface RemovalImpact {
  /** 제거 대상 */
  target: string;
  /** 직·간접 영향받는 하류 전체 */
  affectedDependents: string[];
  /** 끊어야 하는 hard 역의존 (🔴 수작업) */
  hardBlockers: GraphEdge[];
  /** 자연 비활성되는 soft 역의존 (🟢) */
  softDegradations: GraphEdge[];
}
```

### 3.4 그래프 빌더 (순수 함수)

```ts
// libs/module-registry/src/build-graph.ts

/** 매니페스트 목록 → 의존 그래프 (정/역방향, hard/soft) */
export function buildDependencyGraph(manifests: FeatureManifest[]): DependencyGraph;

/** 특정 모듈 제거 시 영향 분석 (대시보드·CLI가 소비) */
export function analyzeRemoval(graph: DependencyGraph, targetId: string): RemovalImpact;

/** 순환 의존 검사 (있으면 안 됨 — 검증용) */
export function findCycles(graph: DependencyGraph): string[][];

/** 대시보드용 JSON 직렬화 (1단계 대비) */
export function serializeGraph(graph: DependencyGraph): string;
```

- 전부 **부수효과 없는 순수 함수**. 입력은 매니페스트 배열, 출력은 그래프/분석.
- `serializeGraph`로 그래프를 JSON으로 뽑아두면, 1단계 대시보드가 백엔드 API나 빌드 산출물로 그대로 소비할 수 있다.

### 3.5 board 매니페스트 — 완성 예시 (조사 기반)

> board 발자국 전수 조사(2026-05-30) 결과를 그대로 채운 것. report·search 매니페스트는 이 패턴을 따른다.

```ts
// apps/core-backend/src/features/board/board.feature.ts
import type { FeatureManifest } from '@weaver2/module-registry';

export const boardFeature: FeatureManifest = {
  id: 'board',
  layer: 'features',
  description: '게시판 — 4단계 대댓글, 리액션, 고정글, 카테고리, 첨부, 풀텍스트 검색',

  dependsOn: [
    { id: 'permission',   kind: 'hard', reason: 'RequirePermission 데코레이터·PermissionService 직접 사용' },
    { id: 'upload',       kind: 'hard', reason: 'PostFile 첨부 — @weaver2/upload' },
    { id: 'notification', kind: 'soft', reason: "EventEmitter2로 'notification.created' emit (리스너 없으면 무시)" },
  ],

  footprint: {
    backendDir: 'apps/core-backend/src/features/board',
    frontendDirs: [
      'apps/core-frontend/src/features/board',
      'apps/core-frontend/src/features/admin/boards',
    ],
    prismaSchema: 'apps/core-backend/prisma/schema/board.prisma',
    prismaModels: ['Board', 'Post', 'Comment', 'PostCategory', 'Emoji', 'PostReaction', 'PostFile'],
    coreBackrefs: ['User.posts', 'User.comments', 'User.reactions', 'User.files'],
    permissions: 'PERMISSIONS.BOARD',  // libs/shared/src/index.ts
    seeds: [
      'apps/core-backend/prisma/seed/board-permission.seed.ts',
    ],
    routes: [
      'apps/core-frontend/src/app/(protected)/boards',
      'apps/core-frontend/src/app/(admin)/admin/boards',
    ],
    pinpoints: [
      'apps/core-backend/src/core.module.ts → BoardModule (import + imports 배열)',
      'apps/core-backend/src/system/admin/api/admin-api.module.ts → BoardModule',
      'apps/core-frontend/src/proxy.ts → PROTECTED_PATHS \'/boards\'',
      'apps/core-backend/prisma/seed/permission-group.seed.ts → PERMISSIONS.BOARD.* 그룹 매핑 (Admin/Operator/Moderator/User)',
      'libs/shared/src/index.ts → PERMISSIONS.BOARD 정의',
      'libs/common/src/constants/permissions.const.ts → BOARD 권한 UI 레이블',
    ],
  },

  removalNotes: [
    {
      severity: 'hard',
      location: 'apps/core-backend/src/features/abuse-report/services/moderation.service.ts',
      note: '🔴 board의 DeletePost/HidePost/HideComment 커맨드를 직접 import·호출. board 제거 시 컴파일 실패 → 게시판 신고 처리 로직 분리 필요 (유저 신고는 유지 가능).',
    },
    {
      severity: 'soft',
      location: 'apps/core-backend/src/features/search',
      note: '🟢 Post/Comment를 인덱싱. board 없으면 게시글 검색 결과만 비고 컴파일은 정상.',
    },
    {
      severity: 'soft',
      location: 'apps/core-backend/src/system/admin/api/services/admin-dashboard.api.service.ts',
      note: '🟢 Post/Comment count 통계. board 없으면 0으로 표시.',
    },
    {
      severity: 'soft',
      location: 'core notification',
      note: "🟢 board가 'notification.created' 발행. 리스너는 board를 역참조 안 함 — 발행만 중단.",
    },
  ],
};
```

### 3.6 abuse-report / search 매니페스트 — 골격

조사에서 확인된 의존 방향(둘 다 board를 향하는 단방향, 서로는 안 엮임)만 반영. 세부 footprint는 구현 시 각자 전수 확인하여 채운다.

```ts
// abuse-report.feature.ts (골격)
export const abuseReportFeature: FeatureManifest = {
  id: 'abuse-report',
  layer: 'features',
  description: '신고/모더레이션 — 다형 신고(Post/Comment/User/Media), 숨김·삭제, 경고·정지',
  dependsOn: [
    { id: 'board',        kind: 'hard', reason: 'ModerationService가 board 커맨드 직접 호출, AbuseReportTarget.POST/COMMENT' },
    { id: 'permission',   kind: 'hard' },
    { id: 'notification', kind: 'soft', reason: '신고 처리/기각 시 신고자에게 알림' },
  ],
  footprint: { /* 구현 시 전수 확인 */ },
  removalNotes: [ /* abuse-report는 최하류 — 아무도 역참조 안 함, 제거 단순 */ ],
};

// search.feature.ts (골격)
export const searchFeature: FeatureManifest = {
  id: 'search',
  layer: 'features',
  description: '풀텍스트 검색 — 게시글·댓글 raw SQL 검색',
  dependsOn: [
    { id: 'board', kind: 'soft', reason: 'Post/Comment를 검색 대상으로 쿼리 (타입 import)' },
  ],
  footprint: { /* 구현 시 전수 확인 */ },
  removalNotes: [ /* search도 최하류 — 제거 단순 */ ],
};
```

> 참고: `abuse-report → board`는 **hard**(직접 import, 제거 시 컴파일 실패)인 반면, `search → board`는 **soft**(없어도 컴파일은 됨)다. 이 강도 차이가 제거 난이도를 가른다.

### 3.7 매니페스트 수집

`libs/module-registry/src/index.ts`가 매니페스트들을 한곳에 모아 빌더에 넘긴다. 0단계에서는 **명시적 등록**(import 후 배열)으로 단순하게 시작한다. (자동 디스커버리는 모듈 수가 늘면 후속 고려.)

```ts
import { boardFeature } from '../../../apps/core-backend/src/features/board/board.feature';
// ... abuse-report, search
export const ALL_MANIFESTS: FeatureManifest[] = [boardFeature, abuseReportFeature, searchFeature];
```

> ⚠️ 결정 필요: `libs`가 `apps`를 역참조하는 import 방향이 모노레포 레이어링상 부자연스럽다.
> 대안 — 매니페스트를 각 feature 폴더가 아니라 `libs/module-registry`에 모으거나, 빌드타임에 glob으로 수집.
> §5 미해결 항목으로 둔다.

### 3.8 DB 모듈 경계 원칙

> 핵심: **모듈 격리 ≠ FK 제거.** FK는 유지하고, 매니페스트가 "각 FK·모델이 어느 모듈 소속인지"를 추적한다.
> weaver2는 **단일 DB 모놀리스**이므로 — 평소엔 FK가 참조 무결성을 보장하고, **격리는 분기(모듈 제거) 시점에만 작동**한다.
> 무결성과 격리는 충돌하지 않는다.

**3원칙**

| 결합 | FK | 무결성 | 원칙 |
|---|---|---|---|
| feature → core (`Post.author → User`) | ✅ 유지 | DB가 보장 | core는 항상 상류·불변. **끊지 않는다** |
| feature ↔ feature (`AbuseReport → Post`) | ❌ 폴리모픽 | 앱 + soft-delete | 다중타입이라 원래 FK 불가. 새 모듈도 모듈 간은 폴리모픽/논리참조 |
| core 역필드 (`User.posts[]`) | — | 무관 | relation 편의 필드. 무결성은 FK 컬럼(`authorId`)이 지킴. 제거 시 `coreBackrefs`로 정리 |

**폴리모픽 무결성 보완** — `targetId`는 FK를 못 박으므로(폴리모픽의 숙명), soft-delete(`deletedAt`)로 고아를 방지하고, 대상 조치 시 관련 신고를 자동 `RESOLVED` 처리하는 앱 로직으로 메운다 (이미 적용됨).

**매니페스트의 역할** — `footprint.prismaModels`(모듈 소유 모델)와 `footprint.coreBackrefs`(core에 생긴 역필드)가 분기 시 *"DB에서 무엇을 떼고, core 모델의 어느 줄을 정리할지"* 를 안내한다. FK는 분기 마이그레이션이 모델과 함께 드롭한다.

**장기(목적2)** — core 모델의 역필드까지 없애 "core가 어떤 feature도 모르는" 완전 격리는, feature가 User를 relation 대신 ID 컬럼으로만 참조해야 가능하다(`include` 편의 상실). DX 비용이 커서 도메인 중립화 본격화 시점에 점진 검토.

---

## 4. 검증 전략

매니페스트는 "실제 코드와 일치"할 때만 가치가 있다. 다음을 자동 검증한다 (테스트 1 묶음):

1. **경로 실재성**: `footprint.backendDir`·`prismaSchema`·`routes`·`seeds`의 경로가 실제 파일/디렉토리로 존재.
2. **핀포인트 일치**: `pinpoints`의 "파일경로" 부분이 실제 파일이고, 화살표 뒤 식별자(예: `BoardModule`)가 그 파일에 실제로 등장.
3. **의존 무결성**: `dependsOn[].id`가 다른 매니페스트의 id이거나 알려진 core 모듈 화이트리스트에 속함.
4. **순환 없음**: `findCycles()` 결과가 빈 배열.

> 이 검증이 통과하면 "매니페스트 = 코드의 진실"이 보장되고, 1·2단계가 안심하고 소비할 수 있다.

---

## 5. 결정 기록 & 미해결

### 결정됨
- 매니페스트는 **TS 객체** (JSON 아님) — 타입 안전·심볼 참조.
- 의존은 **상류만 선언**, 역의존은 계산.
- **hard/soft** 2단계 강도.
- board 역의존 중 **hard는 report 한 곳뿐** → A(문서화) 방식으로 충분히 명료.
- 스펙 문서 위치: `docs/specs/` (실제 `.gitignore`는 docs 전체 추적, `docs/local/`만 제외).
- `report` → `abuse-report` 리네임 완료 (커밋 `d0142d0`). 매니페스트는 `abuse-report`로 작성.

### 미해결 (구현 착수 전 결정)
1. **매니페스트 수집 방향**: `libs → apps` 역참조 회피 방법 (§3.7). 후보: (a) 매니페스트를 libs로 이동, (b) 빌드타임 glob 수집, (c) core-backend가 등록하고 libs는 타입·빌더만 제공.
2. **CHARTER 갱신**: §1(커뮤니티 전용 → 조립식 베이스), §7.3(docs gitignore 실제와 불일치)을 언제 갱신할지.
3. `core`·`infrastructure` 모듈에도 매니페스트를 둘지 (0단계는 features 3개만, core는 "항상 유지"라 dependsOn 타깃으로만 등장).

---

## 6. 다음 단계 연결

0단계 완료 시 산출물:
- `@weaver2/module-registry` (타입 + 빌더 + 검증)
- board(완성)·abuse-report·search 매니페스트
- 직렬화된 의존 그래프 JSON

→ **1단계(대시보드)**는 이 JSON을 백엔드 API(`GET /v1/admin/modules` 등)나 빌드 산출물로 노출해, 개발자 화면에서 "현재 모듈 + 의존 구조"를 시각화한다. 0단계의 `serializeGraph` 출력이 그 입력이 된다.

---

## 관련 문서
- [`CHARTER.md`](../../CHARTER.md) — 보일러플레이트 정체성 (§1·§7.3 갱신 예정)
- [`ROADMAP.md`](../../ROADMAP.md) — 향후 권장 작업
- board 발자국 전수 조사 (2026-05-30, 본 설계의 근거)
