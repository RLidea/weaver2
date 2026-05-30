# Module Registry 0.5단계 — 자동 추출기 설계

> 작성일: 2026-05-31
> 상태: 설계 합의 진행
> 선행: 0단계 (docs/specs/2026-05-30-module-registry-design.md / -plan.md), 브랜치 feat/module-registry

---

## 1. 배경 — 추출기가 필요한 이유 (실증)

0단계에서 board 매니페스트를 **사람이 손으로** 작성했더니 부정확했다:

- **`auth` 의존 누락**: board가 `core/auth/guards/jwt-auth.guard`를 import하는데 `dependsOn`엔 permission·upload·notification만 있고 auth가 빠짐.
- **`notification` kind 모호**: `NotificationEventDto`를 일반 import(값)하므로 정적분석은 `hard`로 보지만 실제는 이벤트 기반(`soft`).
- 공용 lib(`@weaver2/common`·`prisma`·`pagination`)도 import하지만 이건 "떼어낼 모듈"이 아니라 인프라.

→ **사람 매니페스트는 틀린다. 추출기 = 진실의 원천.** 모듈이 늘수록 수작업은 비현실적이고 stale해진다.

## 2. 목적

feature의 **footprint·dependsOn을 코드에서 자동 추출**하고, `verify`로 매니페스트가 실제 코드와 어긋나면(stale·부정확) CI를 빨갛게 만든다.

## 3. 비범위 (0.5 v1)

- ❌ 완전 자동 `.feature.ts` 파일 생성(AST 머지) — `gen`은 초안 출력까지, 반영은 사람
- ❌ 프론트 footprint(`frontendDirs`/`routes`) 자동화 — 후속 (백엔드 우선)
- ❌ `pinpoints`/`coreBackrefs` 자동화 — 후속 (휴리스틱 grep은 1단계 이후)
- ❌ 이벤트 결합(`emit('x')` 문자열) 완전 자동 판정 — 사람 검토 유지
- ❌ 대시보드 — 1단계

## 4. 도구

**ts-morph** (TypeScript AST 래퍼) — devDependency 추가 (`pnpm add -D ts-morph`). TS compiler API보다 import/심볼 분석이 간결.

## 5. 설계

### 5.1 위치

```
libs/module-registry/src/
  known-modules.ts            # import 경로 → 모듈 id allowlist
  extract-manifest.ts         # extractManifest(featureId): ExtractedManifest
  extract-manifest.spec.ts
scripts/module-registry/
  generate.ts                 # pnpm manifest:gen <feature>
  verify.ts                   # pnpm manifest:verify
package.json                  # scripts: manifest:gen, manifest:verify
.github/workflows/*.yml       # verify를 CI에 추가
```

> 추출 로직(`extract-manifest.ts`)은 lib에 두되 ts-morph로 파일시스템을 읽으므로 **순수함수가 아니다**. 0단계의 순수 빌더(`build-graph.ts`)와 구분 — 추출기는 I/O 계층.

### 5.2 의존 모듈 판정 (핵심 결정)

`dependsOn` 대상 = **"떼어낼 수 있는 모듈"만**. import 경로를 모듈 id로 매핑하는 allowlist:

```ts
// known-modules.ts
// import 경로 패턴 → 모듈 id (없으면 의존 아님 = 공용 인프라/프레임워크)
export const KNOWN_MODULES: { test: RegExp; id: string }[] = [
  { test: /\/core\/permission\//,    id: 'permission' },
  { test: /\/core\/notification\//,  id: 'notification' },
  { test: /\/core\/auth\//,          id: 'auth' },
  { test: /\/core\/user\//,          id: 'user' },
  { test: /\/core\/terms\//,         id: 'terms' },
  { test: /@weaver2\/upload/,        id: 'upload' },
  { test: /@weaver2\/email/,         id: 'email' },
  // features 간 의존: ../<feature>/ (board, search 등) → 해당 feature id
];
// 제외(의존 아님): @weaver2/common, @weaver2/prisma, @weaver2/pagination,
//                  @weaver2/shared, @weaver2/module-registry, @nestjs/*, 외부 패키지
```

features 간 의존은 `../<other-feature>/` 경로로 감지하여 그 feature id로 매핑.

### 5.3 hard / soft 판정

- **값 import** (`import { X }`) → `hard` (기본)
- **type-only import** (`import type { X }`) → `soft`
- **휴리스틱**: import 대상이 `*/dto/*` 또는 `*-event*` 뿐이고 service/command를 import 안 하면 `soft` 후보
- **한계**: `eventEmitter.emit('notification.created')` 같은 문자열 결합은 import가 없어 감지 불가. notification처럼 DTO만 import하는 이벤트 의존은 위 휴리스틱으로 `soft` 판정 가능하나, 확신은 사람이.
- verify는 **의존 id 집합 일치**를 우선 검사(strict), **kind 불일치는 경고**(warn)로 처리하여 정적분석 한계를 수용.

### 5.4 자동 추출 필드 (v1)

| 필드 | 추출 방법 |
|---|---|
| `dependsOn[].id` | `features/<id>/**/*.ts`의 import를 ts-morph로 파싱 → KNOWN_MODULES 매핑 (dedupe) |
| `dependsOn[].kind` | 5.3 규칙 |
| `footprint.backendDir` | `apps/core-backend/src/features/<id>` (컨벤션) |
| `footprint.prismaSchema` | `apps/core-backend/prisma/schema/<id>.prisma` (존재 시) |
| `footprint.prismaModels` | 위 .prisma 파일에서 `model X {` 선언 파싱 |
| `footprint.permissions` | `features/<id>` 내 `PERMISSIONS.<UPPER>` 패턴 → `'PERMISSIONS.<UPPER>'` |

**사람 필드(추출 안 함, 기존 유지)**: `description`, `dependsOn[].reason`, `removalNotes`, `frontendDirs`, `routes`, `pinpoints`, `coreBackrefs`.

```ts
// 추출기 반환형 — 자동 가능한 부분집합만
export interface ExtractedManifest {
  id: string;
  dependsOn: { id: string; kind: 'hard' | 'soft' }[];
  footprint: Pick<FeatureFootprint,
    'backendDir' | 'prismaSchema' | 'prismaModels' | 'permissions'>;
}
```

### 5.5 gen / verify

- **`pnpm manifest:gen <feature>`** — `extractManifest(feature)` 결과를 콘솔/JSON으로 출력. 신규 모듈 작성 시 사람이 이걸 보고 `.feature.ts`의 footprint·dependsOn을 채운다. (자동 파일 생성은 비범위)
- **`pnpm manifest:verify`** — 모든 feature에 대해: 추출한 자동필드 vs 기존 `.feature.ts`의 같은 필드 비교.
  - 의존 id 집합 불일치 → **에러 (exit 1)**
  - footprint 자동필드 불일치 → **에러**
  - kind 불일치 → **경고**
- **CI 추가** — 기존 `.github/workflows`의 test/lint job에 `pnpm manifest:verify` 스텝 추가 → 코드와 매니페스트가 어긋난 PR을 차단.

### 5.6 합격 기준 — board 정답지

추출기를 board에 돌린 결과가 board 매니페스트의 자동필드와 일치해야 한다. 단 **§1에서 발견한 board 매니페스트의 오류를 먼저 교정**한다:
- `dependsOn`에 `{ id: 'auth', kind: 'hard', reason: 'jwt-auth.guard 사용' }` 추가
- `notification` kind는 휴리스틱(DTO-only import) 결과를 확인하여 확정 (soft 유지 예상)

## 6. 작업 순서 (구현 플랜 골격)

1. `ts-morph` devDep 추가
2. `known-modules.ts` allowlist 정의 (+ 단위테스트)
3. `extract-manifest.ts` — `extractManifest(featureId)` TDD 구현 (import 파싱 → dependsOn, footprint 자동필드)
4. **board 매니페스트 교정** (auth 추가) + extractManifest(board)가 일치하는지 테스트
5. abuse-report·search도 추출해 골격 footprint 채움
6. `scripts/module-registry/{generate,verify}.ts` + package.json scripts
7. CI에 `manifest:verify` 추가
8. 전체 `pnpm manifest:verify` 그린 + 회귀 테스트

## 7. 미해결

- `frontendDirs`/`routes`/`pinpoints`/`coreBackrefs` 자동화 시점 (후속, 프론트 분석 필요)
- 이벤트 결합 감지 휴리스틱 정교화 (emit 문자열 스캔 추가 여부)
- verify의 kind 경고를 언제 에러로 승격할지

## 관련 문서
- 0단계 스펙: docs/specs/2026-05-30-module-registry-design.md
- 0단계 플랜: docs/specs/2026-05-30-module-registry-plan.md
