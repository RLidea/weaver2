# Module Registry 0단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `@weaver2/module-registry` lib(매니페스트 타입 + 순수 그래프 빌더)을 만들고, board를 완성 표본으로, abuse-report·search를 골격으로 매니페스트를 작성한 뒤, 매니페스트가 실제 코드와 일치하는지 검증한다.

**Architecture:** lib은 **타입 + 순수함수만** 제공(apps 의존 0). 매니페스트 인스턴스는 각 feature 폴더에 co-locate, 수집(`ALL_MANIFESTS`)은 `apps/core-backend`에서 한다 → `libs→apps` 역참조 없음. 런타임 동작 변경 0 (지식의 응집).

**Tech Stack:** TypeScript, NestJS 모노레포(libs), jest + ts-jest. 빌더는 의존성 없는 순수 TS.

**브랜치:** `feat/module-registry` (이미 체크아웃됨)

**참조 스펙:** `docs/specs/2026-05-30-module-registry-design.md`

---

## File Structure

```
libs/module-registry/
  tsconfig.lib.json                  # lib 빌드 설정 (shared 템플릿 복사)
  src/
    feature-manifest.type.ts         # FeatureManifest, FeatureDependency, FeatureFootprint, RemovalNote
    dependency-graph.type.ts         # GraphNode, GraphEdge, DependencyGraph, RemovalImpact
    build-graph.ts                   # buildDependencyGraph, analyzeRemoval, findCycles, serializeGraph
    build-graph.spec.ts              # 빌더 단위 테스트 (작은 픽스처)
    index.ts                         # 공개 API 배럴

apps/core-backend/src/features/
  board/board.feature.ts             # 완성 표본 (정답지)
  abuse-report/abuse-report.feature.ts  # 골격
  search/search.feature.ts           # 골격
  manifests.ts                       # ALL_MANIFESTS 수집 + 검증 테스트 대상
  manifests.spec.ts                  # 매니페스트 ↔ 실제 코드 일치 검증

수정:
  tsconfig.json                      # paths: @weaver2/module-registry
  jest.config.js                     # moduleNameMapper
  nest-cli.json                      # projects.module-registry
```

---

## Task 1: `@weaver2/module-registry` lib 스캐폴딩 + 등록

**Files:**
- Create: `libs/module-registry/tsconfig.lib.json`
- Create: `libs/module-registry/src/index.ts`
- Modify: `tsconfig.json` (paths 블록)
- Modify: `jest.config.js` (moduleNameMapper)
- Modify: `nest-cli.json` (projects)

- [ ] **Step 1: lib tsconfig 작성**

Create `libs/module-registry/tsconfig.lib.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "outDir": "../../dist/libs/module-registry"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

- [ ] **Step 2: 임시 배럴 작성** (다음 task들이 채움)

Create `libs/module-registry/src/index.ts`:
```ts
export {};
```

- [ ] **Step 3: tsconfig.json paths 등록**

`tsconfig.json`의 `paths`에 추가 (`@weaver2/shared` 블록과 같은 형식):
```json
      "@weaver2/module-registry": [
        "libs/module-registry/src"
      ],
      "@weaver2/module-registry/*": [
        "libs/module-registry/src/*"
      ],
```

- [ ] **Step 4: jest.config.js moduleNameMapper 등록**

`apps/core-backend/jest.config.js`의 `moduleNameMapper`에 추가:
```js
    '^@weaver2/module-registry(|/.*)$': '<rootDir>/libs/module-registry/src/$1',
```

- [ ] **Step 5: nest-cli.json projects 등록**

`nest-cli.json`의 `projects`에 추가:
```json
    "module-registry": {
      "type": "library",
      "root": "libs/module-registry",
      "entryFile": "index",
      "sourceRoot": "libs/module-registry/src",
      "compilerOptions": {
        "tsConfigPath": "libs/module-registry/tsconfig.lib.json"
      }
    },
```

- [ ] **Step 6: 등록 확인**

Run: `npx tsc --noEmit -p apps/core-backend/tsconfig.app.json 2>&1 | head -5`
Expected: 에러 없음 (빈 lib이라 통과)

- [ ] **Step 7: Commit**

```bash
git add libs/module-registry tsconfig.json apps/core-backend/jest.config.js nest-cli.json
git commit -m "$(cat <<'EOF'
chore(module-registry): scaffold @weaver2/module-registry lib

Register empty module-registry lib (tsconfig paths, jest mapper, nest-cli).

---
@weaver2/module-registry 빈 lib 등록 (tsconfig·jest·nest-cli).
EOF
)"
```

---

## Task 2: `FeatureManifest` 타입 정의

**Files:**
- Create: `libs/module-registry/src/feature-manifest.type.ts`

- [ ] **Step 1: 타입 작성**

Create `libs/module-registry/src/feature-manifest.type.ts`:
```ts
export type ModuleLayer = 'core' | 'features' | 'infrastructure' | 'system';
export type DependencyKind = 'hard' | 'soft';

export interface FeatureDependency {
  /** 의존 대상 모듈 id (다른 매니페스트의 id 또는 알려진 core 모듈) */
  id: string;
  /** hard: 직접 import, 없으면 컴파일 실패 / soft: 타입·데이터·이벤트, 없어도 컴파일 OK */
  kind: DependencyKind;
  /** 왜 의존하는지 (사람이 읽는 메모) */
  reason?: string;
}

export interface FeatureFootprint {
  /** 백엔드 모듈 디렉토리 (통째 삭제 대상) */
  backendDir?: string;
  /** 프론트 디렉토리들 (feature + admin 등 여러 곳) */
  frontendDirs?: string[];
  /** 분할된 Prisma 스키마 파일 */
  prismaSchema?: string;
  /** 이 모듈이 소유한 Prisma 모델명 (분기 시 제거 대상) */
  prismaModels?: string[];
  /** core 모델에 생긴 역참조 relation 필드 (제거 시 정리 — 무결성과 무관) */
  coreBackrefs?: string[];
  /** 권한 상수 키 (예: 'PERMISSIONS.BOARD') */
  permissions?: string;
  /** 시드 파일들 */
  seeds?: string[];
  /** Next.js 라우트 경로들 */
  routes?: string[];
  /** 흩어진 핀포인트 등록 지점. "파일경로 → 식별자" 형태 */
  pinpoints?: string[];
}

export interface RemovalNote {
  /** hard: 컴파일/기능이 깨짐(수작업) / soft: 자연 비활성 */
  severity: DependencyKind;
  location: string;
  note: string;
}

export interface FeatureManifest {
  /** 고유 id (= 디렉토리명) */
  id: string;
  layer: ModuleLayer;
  /** 한 줄 설명 */
  description: string;
  /** 이 모듈이 의존하는 상류 (역의존은 그래프가 계산) */
  dependsOn: FeatureDependency[];
  footprint: FeatureFootprint;
  /** 이 모듈 제거 시 영향받는 지점 */
  removalNotes: RemovalNote[];
}
```

- [ ] **Step 2: 컴파일 확인**

Run: `npx tsc --noEmit libs/module-registry/src/feature-manifest.type.ts`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add libs/module-registry/src/feature-manifest.type.ts
git commit -m "$(cat <<'EOF'
feat(module-registry): add FeatureManifest type

---
FeatureManifest 타입 추가.
EOF
)"
```

---

## Task 3: `DependencyGraph` 타입 정의

**Files:**
- Create: `libs/module-registry/src/dependency-graph.type.ts`

- [ ] **Step 1: 타입 작성**

Create `libs/module-registry/src/dependency-graph.type.ts`:
```ts
import type { ModuleLayer, DependencyKind } from './feature-manifest.type';

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
  target: string;
  /** 직·간접 영향받는 하류 전체 */
  affectedDependents: string[];
  /** 끊어야 하는 hard 역의존 */
  hardBlockers: GraphEdge[];
  /** 자연 비활성되는 soft 역의존 */
  softDegradations: GraphEdge[];
}
```

- [ ] **Step 2: 컴파일 확인**

Run: `npx tsc --noEmit -p apps/core-backend/tsconfig.app.json 2>&1 | grep module-registry | head -5`
Expected: 출력 없음 (에러 없음)

- [ ] **Step 3: Commit**

```bash
git add libs/module-registry/src/dependency-graph.type.ts
git commit -m "$(cat <<'EOF'
feat(module-registry): add DependencyGraph types

---
DependencyGraph 타입 추가.
EOF
)"
```

---

## Task 4: `buildDependencyGraph` (TDD)

**Files:**
- Create: `libs/module-registry/src/build-graph.spec.ts`
- Create: `libs/module-registry/src/build-graph.ts`

- [ ] **Step 1: 실패 테스트 작성**

Create `libs/module-registry/src/build-graph.spec.ts`:
```ts
import { buildDependencyGraph } from './build-graph';
import type { FeatureManifest } from './feature-manifest.type';

const fixtures: FeatureManifest[] = [
  {
    id: 'board', layer: 'features', description: 'board',
    dependsOn: [{ id: 'permission', kind: 'hard' }],
    footprint: {}, removalNotes: [],
  },
  {
    id: 'abuse-report', layer: 'features', description: 'abuse-report',
    dependsOn: [{ id: 'board', kind: 'hard' }, { id: 'permission', kind: 'hard' }],
    footprint: {}, removalNotes: [],
  },
  {
    id: 'search', layer: 'features', description: 'search',
    dependsOn: [{ id: 'board', kind: 'soft' }],
    footprint: {}, removalNotes: [],
  },
];

describe('buildDependencyGraph', () => {
  it('creates one node per manifest', () => {
    const g = buildDependencyGraph(fixtures);
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['abuse-report', 'board', 'search']);
  });

  it('records direct dependencies (상류)', () => {
    const g = buildDependencyGraph(fixtures);
    expect(g.dependencies['abuse-report'].sort()).toEqual(['board', 'permission']);
    expect(g.dependencies['search']).toEqual(['board']);
  });

  it('computes dependents (역의존, 하류) for board', () => {
    const g = buildDependencyGraph(fixtures);
    expect(g.dependents['board'].sort()).toEqual(['abuse-report', 'search']);
  });

  it('records edges with kind', () => {
    const g = buildDependencyGraph(fixtures);
    const e = g.edges.find((x) => x.from === 'search' && x.to === 'board');
    expect(e?.kind).toBe('soft');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest --config apps/core-backend/jest.config.js build-graph --no-coverage`
Expected: FAIL — "Cannot find module './build-graph'"

- [ ] **Step 3: 최소 구현**

Create `libs/module-registry/src/build-graph.ts`:
```ts
import type { FeatureManifest } from './feature-manifest.type';
import type { DependencyGraph, GraphNode, GraphEdge } from './dependency-graph.type';

export function buildDependencyGraph(manifests: FeatureManifest[]): DependencyGraph {
  const nodes: GraphNode[] = manifests.map((m) => ({
    id: m.id,
    layer: m.layer,
    description: m.description,
  }));

  const edges: GraphEdge[] = [];
  const dependencies: Record<string, string[]> = {};
  const dependents: Record<string, string[]> = {};

  for (const m of manifests) {
    dependencies[m.id] = m.dependsOn.map((d) => d.id);
    dependents[m.id] = dependents[m.id] ?? [];
    for (const dep of m.dependsOn) {
      edges.push({ from: m.id, to: dep.id, kind: dep.kind });
      dependents[dep.id] = dependents[dep.id] ?? [];
      dependents[dep.id].push(m.id);
    }
  }

  return { nodes, edges, dependencies, dependents };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest --config apps/core-backend/jest.config.js build-graph --no-coverage`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add libs/module-registry/src/build-graph.ts libs/module-registry/src/build-graph.spec.ts
git commit -m "$(cat <<'EOF'
feat(module-registry): add buildDependencyGraph

Build forward/reverse dependency graph from manifests (pure function).

---
매니페스트에서 정/역방향 의존 그래프 계산 (순수함수).
EOF
)"
```

---

## Task 5: `analyzeRemoval` (TDD)

**Files:**
- Modify: `libs/module-registry/src/build-graph.spec.ts` (테스트 추가)
- Modify: `libs/module-registry/src/build-graph.ts` (함수 추가)

- [ ] **Step 1: 실패 테스트 추가**

`build-graph.spec.ts` 상단 import에 `analyzeRemoval` 추가:
```ts
import { buildDependencyGraph, analyzeRemoval } from './build-graph';
```

파일 끝에 describe 블록 추가:
```ts
describe('analyzeRemoval', () => {
  it('lists all downstream dependents of board', () => {
    const g = buildDependencyGraph(fixtures);
    const impact = analyzeRemoval(g, 'board');
    expect(impact.affectedDependents.sort()).toEqual(['abuse-report', 'search']);
  });

  it('separates hard blockers from soft degradations', () => {
    const g = buildDependencyGraph(fixtures);
    const impact = analyzeRemoval(g, 'board');
    expect(impact.hardBlockers.map((e) => e.from)).toEqual(['abuse-report']);
    expect(impact.softDegradations.map((e) => e.from)).toEqual(['search']);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest --config apps/core-backend/jest.config.js build-graph --no-coverage`
Expected: FAIL — "analyzeRemoval is not a function"

- [ ] **Step 3: 구현 추가**

`build-graph.ts` 끝에 추가:
```ts
import type { RemovalImpact } from './dependency-graph.type';

export function analyzeRemoval(graph: DependencyGraph, targetId: string): RemovalImpact {
  // 직·간접 하류 BFS
  const affected = new Set<string>();
  const queue = [...(graph.dependents[targetId] ?? [])];
  while (queue.length) {
    const id = queue.shift() as string;
    if (affected.has(id)) continue;
    affected.add(id);
    queue.push(...(graph.dependents[id] ?? []));
  }

  // target을 직접 가리키는 edge를 강도별로 분류
  const incoming = graph.edges.filter((e) => e.to === targetId);
  return {
    target: targetId,
    affectedDependents: [...affected],
    hardBlockers: incoming.filter((e) => e.kind === 'hard'),
    softDegradations: incoming.filter((e) => e.kind === 'soft'),
  };
}
```

> 주의: `import type { RemovalImpact }`를 파일 상단의 기존 `dependency-graph.type` import에 합쳐도 된다. 별도 줄도 TS가 허용한다.

- [ ] **Step 4: 통과 확인**

Run: `npx jest --config apps/core-backend/jest.config.js build-graph --no-coverage`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add libs/module-registry/src/build-graph.ts libs/module-registry/src/build-graph.spec.ts
git commit -m "$(cat <<'EOF'
feat(module-registry): add analyzeRemoval

Classify removal impact into hard blockers vs soft degradations.

---
제거 영향을 hard 차단 vs soft 자연비활성으로 분류.
EOF
)"
```

---

## Task 6: `findCycles` (TDD)

**Files:**
- Modify: `libs/module-registry/src/build-graph.spec.ts`
- Modify: `libs/module-registry/src/build-graph.ts`

- [ ] **Step 1: 실패 테스트 추가**

import에 `findCycles` 추가, 파일 끝에:
```ts
describe('findCycles', () => {
  it('returns empty for an acyclic graph', () => {
    const g = buildDependencyGraph(fixtures);
    expect(findCycles(g)).toEqual([]);
  });

  it('detects a cycle', () => {
    const cyclic: FeatureManifest[] = [
      { id: 'a', layer: 'features', description: 'a', dependsOn: [{ id: 'b', kind: 'hard' }], footprint: {}, removalNotes: [] },
      { id: 'b', layer: 'features', description: 'b', dependsOn: [{ id: 'a', kind: 'hard' }], footprint: {}, removalNotes: [] },
    ];
    const g = buildDependencyGraph(cyclic);
    expect(findCycles(g).length).toBeGreaterThan(0);
  });

  it('ignores deps not present as nodes (core modules)', () => {
    // fixtures의 'permission'은 노드가 아님 → 무시되어 순환 없음
    const g = buildDependencyGraph(fixtures);
    expect(findCycles(g)).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest --config apps/core-backend/jest.config.js build-graph --no-coverage`
Expected: FAIL — "findCycles is not a function"

- [ ] **Step 3: 구현 추가**

`build-graph.ts` 끝에 추가:
```ts
export function findCycles(graph: DependencyGraph): string[][] {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color: Record<string, number> = {};
  const known = new Set(graph.nodes.map((n) => n.id));
  for (const n of graph.nodes) color[n.id] = WHITE;

  const cycles: string[][] = [];
  const stack: string[] = [];

  function dfs(id: string): void {
    color[id] = GRAY;
    stack.push(id);
    for (const dep of graph.dependencies[id] ?? []) {
      if (!known.has(dep)) continue; // 노드가 아닌 의존(core 등)은 무시
      if (color[dep] === GRAY) {
        cycles.push(stack.slice(stack.indexOf(dep)));
      } else if (color[dep] === WHITE) {
        dfs(dep);
      }
    }
    stack.pop();
    color[id] = BLACK;
  }

  for (const n of graph.nodes) {
    if (color[n.id] === WHITE) dfs(n.id);
  }
  return cycles;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest --config apps/core-backend/jest.config.js build-graph --no-coverage`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add libs/module-registry/src/build-graph.ts libs/module-registry/src/build-graph.spec.ts
git commit -m "$(cat <<'EOF'
feat(module-registry): add findCycles

Detect dependency cycles (ignores non-node deps like core modules).

---
의존 순환 탐지 (core 같은 비노드 의존은 무시).
EOF
)"
```

---

## Task 7: `serializeGraph` (TDD)

**Files:**
- Modify: `libs/module-registry/src/build-graph.spec.ts`
- Modify: `libs/module-registry/src/build-graph.ts`

- [ ] **Step 1: 실패 테스트 추가**

import에 `serializeGraph` 추가, 파일 끝에:
```ts
describe('serializeGraph', () => {
  it('produces valid JSON round-trippable to the graph shape', () => {
    const g = buildDependencyGraph(fixtures);
    const json = serializeGraph(g);
    const parsed = JSON.parse(json);
    expect(parsed.nodes).toHaveLength(3);
    expect(parsed.dependents.board.sort()).toEqual(['abuse-report', 'search']);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest --config apps/core-backend/jest.config.js build-graph --no-coverage`
Expected: FAIL — "serializeGraph is not a function"

- [ ] **Step 3: 구현 추가**

`build-graph.ts` 끝에 추가:
```ts
export function serializeGraph(graph: DependencyGraph): string {
  return JSON.stringify(graph, null, 2);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest --config apps/core-backend/jest.config.js build-graph --no-coverage`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add libs/module-registry/src/build-graph.ts libs/module-registry/src/build-graph.spec.ts
git commit -m "$(cat <<'EOF'
feat(module-registry): add serializeGraph

JSON serialization for stage-1 dashboard consumption.

---
1단계 대시보드 소비용 JSON 직렬화.
EOF
)"
```

---

## Task 8: 공개 API 배럴

**Files:**
- Modify: `libs/module-registry/src/index.ts`

- [ ] **Step 1: 배럴 작성**

Replace `libs/module-registry/src/index.ts`:
```ts
export type {
  ModuleLayer,
  DependencyKind,
  FeatureDependency,
  FeatureFootprint,
  RemovalNote,
  FeatureManifest,
} from './feature-manifest.type';

export type {
  GraphNode,
  GraphEdge,
  DependencyGraph,
  RemovalImpact,
} from './dependency-graph.type';

export {
  buildDependencyGraph,
  analyzeRemoval,
  findCycles,
  serializeGraph,
} from './build-graph';
```

- [ ] **Step 2: import 확인**

Run: `npx tsc --noEmit -p apps/core-backend/tsconfig.app.json 2>&1 | grep module-registry | head -5`
Expected: 출력 없음

- [ ] **Step 3: Commit**

```bash
git add libs/module-registry/src/index.ts
git commit -m "$(cat <<'EOF'
feat(module-registry): export public API barrel

---
공개 API 배럴 export.
EOF
)"
```

---

## Task 9: board 매니페스트 (완성 표본 = 정답지)

**Files:**
- Create: `apps/core-backend/src/features/board/board.feature.ts`

스펙 §3.5의 board 예시를 그대로 작성한다 (조사 2026-05-30 기반).

- [ ] **Step 1: 매니페스트 작성**

Create `apps/core-backend/src/features/board/board.feature.ts`:
```ts
import type { FeatureManifest } from '@weaver2/module-registry';

export const boardFeature: FeatureManifest = {
  id: 'board',
  layer: 'features',
  description: '게시판 — 4단계 대댓글, 리액션, 고정글, 카테고리, 첨부, 풀텍스트 검색',

  dependsOn: [
    { id: 'permission', kind: 'hard', reason: 'RequirePermission 데코레이터·PermissionService 직접 사용' },
    { id: 'upload', kind: 'hard', reason: 'PostFile 첨부 — @weaver2/upload' },
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
    permissions: 'PERMISSIONS.BOARD',
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
      'libs/common/src/constants/permissions.const.ts → BOARD 레이블',
    ],
  },

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
};
```

- [ ] **Step 2: 컴파일 + 경로 실재 확인**

Run: `npx tsc --noEmit -p apps/core-backend/tsconfig.app.json 2>&1 | grep board.feature | head -5`
Expected: 출력 없음

Run: `ls apps/core-backend/src/features/board apps/core-backend/prisma/schema/board.prisma`
Expected: 디렉토리·파일 존재

- [ ] **Step 3: Commit**

```bash
git add apps/core-backend/src/features/board/board.feature.ts
git commit -m "$(cat <<'EOF'
feat(board): add board feature manifest (golden sample)

Complete manifest for board — the reference for the future extractor.

---
board feature 매니페스트 추가 (자동 추출기의 정답지 표본).
EOF
)"
```

---

## Task 10: abuse-report / search 매니페스트 골격

**Files:**
- Create: `apps/core-backend/src/features/abuse-report/abuse-report.feature.ts`
- Create: `apps/core-backend/src/features/search/search.feature.ts`

> footprint 세부는 0.5단계 추출기가 채울 예정. 0단계에서는 **id·layer·description·dependsOn**만 확정하고, footprint는 검증을 통과할 최소값(backendDir)만 채운다.

- [ ] **Step 1: abuse-report 매니페스트**

Create `apps/core-backend/src/features/abuse-report/abuse-report.feature.ts`:
```ts
import type { FeatureManifest } from '@weaver2/module-registry';

export const abuseReportFeature: FeatureManifest = {
  id: 'abuse-report',
  layer: 'features',
  description: '신고/모더레이션 — 다형 신고(Post/Comment/User/Media), 숨김·삭제, 경고·정지',
  dependsOn: [
    { id: 'board', kind: 'hard', reason: 'ModerationService가 board 커맨드 직접 호출, AbuseReportTarget.POST/COMMENT' },
    { id: 'permission', kind: 'hard' },
    { id: 'notification', kind: 'soft', reason: '신고 처리/기각 시 신고자에게 알림' },
  ],
  footprint: {
    backendDir: 'apps/core-backend/src/features/abuse-report',
    prismaSchema: 'apps/core-backend/prisma/schema/abuse-report.prisma',
    permissions: 'PERMISSIONS.ABUSE_REPORT',
  },
  removalNotes: [], // 최하류 — 아무도 역참조 안 함, 제거 단순
};
```

- [ ] **Step 2: search 매니페스트**

Create `apps/core-backend/src/features/search/search.feature.ts`:
```ts
import type { FeatureManifest } from '@weaver2/module-registry';

export const searchFeature: FeatureManifest = {
  id: 'search',
  layer: 'features',
  description: '풀텍스트 검색 — 게시글·댓글 raw SQL 검색',
  dependsOn: [
    { id: 'board', kind: 'soft', reason: 'Post/Comment를 검색 대상으로 쿼리 (타입 import)' },
  ],
  footprint: {
    backendDir: 'apps/core-backend/src/features/search',
  },
  removalNotes: [], // 최하류 — 제거 단순
};
```

- [ ] **Step 3: 컴파일 + 경로 실재 확인**

Run: `npx tsc --noEmit -p apps/core-backend/tsconfig.app.json 2>&1 | grep feature | head -5`
Expected: 출력 없음

Run: `ls apps/core-backend/prisma/schema/abuse-report.prisma apps/core-backend/src/features/search`
Expected: 존재

- [ ] **Step 4: Commit**

```bash
git add apps/core-backend/src/features/abuse-report/abuse-report.feature.ts apps/core-backend/src/features/search/search.feature.ts
git commit -m "$(cat <<'EOF'
feat: add abuse-report and search feature manifests (skeleton)

dependsOn confirmed; footprint detail deferred to extractor (stage 0.5).

---
abuse-report·search 매니페스트 골격 추가 (의존 확정, footprint는 0.5단계).
EOF
)"
```

---

## Task 11: 매니페스트 수집 `ALL_MANIFESTS`

**Files:**
- Create: `apps/core-backend/src/features/manifests.ts`

> 수집은 `apps`에서 한다(§3.7 (c)안). lib은 타입·빌더만, 인스턴스 import는 apps 방향.

- [ ] **Step 1: 수집 모듈 작성**

Create `apps/core-backend/src/features/manifests.ts`:
```ts
import type { FeatureManifest } from '@weaver2/module-registry';
import { boardFeature } from './board/board.feature';
import { abuseReportFeature } from './abuse-report/abuse-report.feature';
import { searchFeature } from './search/search.feature';

export const ALL_MANIFESTS: FeatureManifest[] = [
  boardFeature,
  abuseReportFeature,
  searchFeature,
];
```

- [ ] **Step 2: 컴파일 확인**

Run: `npx tsc --noEmit -p apps/core-backend/tsconfig.app.json 2>&1 | grep manifests | head -5`
Expected: 출력 없음

- [ ] **Step 3: Commit**

```bash
git add apps/core-backend/src/features/manifests.ts
git commit -m "$(cat <<'EOF'
feat(module-registry): collect ALL_MANIFESTS in core-backend

Manifest instances collected app-side to avoid libs->apps back-reference.

---
매니페스트 수집을 app 쪽에 둠 (libs->apps 역참조 회피).
EOF
)"
```

---

## Task 12: 매니페스트 ↔ 코드 일치 검증 (TDD)

**Files:**
- Create: `apps/core-backend/src/features/manifests.spec.ts`

스펙 §4 검증 전략: 경로 실재 / 핀포인트 일치 / 의존 무결성 / 순환 없음.

- [ ] **Step 1: 검증 테스트 작성**

Create `apps/core-backend/src/features/manifests.spec.ts`:
```ts
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { buildDependencyGraph, findCycles } from '@weaver2/module-registry';
import { ALL_MANIFESTS } from './manifests';

// 모노레포 루트 (이 파일: apps/core-backend/src/features → 4단계 상위)
const ROOT = resolve(__dirname, '../../../..');
const KNOWN_CORE = ['permission', 'notification', 'upload', 'user', 'auth', 'terms'];

describe('manifest ↔ code consistency', () => {
  it('1. footprint paths exist on disk', () => {
    for (const m of ALL_MANIFESTS) {
      const paths = [
        m.footprint.backendDir,
        m.footprint.prismaSchema,
        ...(m.footprint.frontendDirs ?? []),
        ...(m.footprint.seeds ?? []),
        ...(m.footprint.routes ?? []),
      ].filter(Boolean) as string[];
      for (const p of paths) {
        expect({ id: m.id, path: p, exists: existsSync(resolve(ROOT, p)) })
          .toEqual({ id: m.id, path: p, exists: true });
      }
    }
  });

  it('2. pinpoint files exist and contain the identifier', () => {
    for (const m of ALL_MANIFESTS) {
      for (const pin of m.footprint.pinpoints ?? []) {
        const [file, ident] = pin.split('→').map((s) => s.trim());
        const full = resolve(ROOT, file);
        expect({ pin, exists: existsSync(full) }).toEqual({ pin, exists: true });
        // 식별자의 핵심 토큰(공백 앞부분)이 파일에 등장하는지
        const token = ident.split(/[\s.*]/)[0];
        expect({ pin, found: readFileSync(full, 'utf8').includes(token) })
          .toEqual({ pin, found: true });
      }
    }
  });

  it('3. every dependsOn id is another manifest or a known core module', () => {
    const ids = new Set(ALL_MANIFESTS.map((m) => m.id));
    for (const m of ALL_MANIFESTS) {
      for (const dep of m.dependsOn) {
        expect({ from: m.id, dep: dep.id, valid: ids.has(dep.id) || KNOWN_CORE.includes(dep.id) })
          .toEqual({ from: m.id, dep: dep.id, valid: true });
      }
    }
  });

  it('4. graph has no cycles', () => {
    const g = buildDependencyGraph(ALL_MANIFESTS);
    expect(findCycles(g)).toEqual([]);
  });
});
```

- [ ] **Step 2: 실행 (통과 기대 — 매니페스트가 정확하면 PASS)**

Run: `npx jest --config apps/core-backend/jest.config.js manifests --no-coverage`
Expected: PASS (4 tests). 만약 FAIL이면 매니페스트의 경로/핀포인트를 실제 코드에 맞게 수정 (코드가 아니라 매니페스트를 고친다).

- [ ] **Step 3: 전체 테스트 회귀 확인**

Run: `pnpm test`
Expected: 모든 스위트 PASS (기존 102 + 신규)

- [ ] **Step 4: Commit**

```bash
git add apps/core-backend/src/features/manifests.spec.ts
git commit -m "$(cat <<'EOF'
test(module-registry): verify manifests match actual code

Path existence, pinpoint identifiers, dependency integrity, no cycles.

---
매니페스트가 실제 코드와 일치하는지 검증 (경로·핀포인트·의존·순환).
EOF
)"
```

---

## 완료 기준 (Definition of Done)

- [ ] `@weaver2/module-registry` lib 등록·빌드됨
- [ ] 타입(FeatureManifest, DependencyGraph) 정의
- [ ] 빌더 4함수(build/analyze/findCycles/serialize) + 단위테스트 10개 PASS
- [ ] board 매니페스트 완성, abuse-report·search 골격
- [ ] `ALL_MANIFESTS` 수집 (app 쪽)
- [ ] 매니페스트↔코드 일치 검증 4종 PASS
- [ ] `pnpm test` 전체 그린, 런타임 동작 변경 0

## 비범위 (다음 단계)
- 자동 추출기(`manifest:gen`/`verify`) — 0.5단계 (board 표본을 정답지로)
- 대시보드 — 1단계
- 설치/제거 CLI — 2단계
- §5 미해결: CHARTER 갱신, core/infra 매니페스트
