# Module Registry 2단계 — 카탈로그 + 설치/제거 설계

> 작성일: 2026-05-31
> 선행: 0단계(매니페스트·빌더), 0.5단계(추출기·verify), 1단계(대시보드). 브랜치 feat/module-registry
> 성격: 본격 R&D. 이 문서는 **설계 방향 + 핵심 결정 + PoC 순서**. 완벽한 구현 명세가 아니라 합의된 골격.

---

## 1. 목적과 조건

weaver2를 **"shadcn/ui 모델의 백엔드 모듈 시스템"**으로. `npx shadcn add button`이 컴포넌트를 node_modules가 아니라 프로젝트 소스로 복사하듯, 모듈을 **소스로** 프로젝트에 설치/제거한다.

충족해야 할 조건:
1. **설치/제거가 쉽고 멱등** — 운영 데이터 없으면 반복해도 무탈. 운영 데이터 있으면 삭제 시 경고.
2. **배포 시 미설치 모듈은 빌드 제외** — 번들에 안 들어감.
3. **고객사 전달 시 미설치 코드 제외** — 소스 자체가 전달물에 없을 수 있어야 (유출 차단).

## 2. 핵심 결정 — "별도 카탈로그 + 소스 복사"

```
카탈로그 (별도 private git repo: weaver-module-catalog)
  modules/board/   modules/shop/   modules/chat/  ...   ← 모든 모듈 원본 (마스터)
        │  pnpm module:add shop  (degit 소스 복사)
        ▼
메인 프로젝트 repo
  apps/core-backend/src/features/shop/   ← 소스로 직접 (node_modules 아님)
  ... + 등록 codegen
```

- **카탈로그 = 별도 private repo** → 접근 권한 분리. 카탈로그 권한 없는 직원은 미설치 모듈 코드를 **아예 못 봄**(조건3 유출 차단).
- **메인 프로젝트 repo엔 설치된 모듈만 존재** → 미설치는 평소에도 없음 → 빌드·전달 자동 제외(조건2·3), 실수 유출 위험 0.
- **제거 후 카탈로그 원본은 영구** → 반복 설치 멱등(조건1).

> 왜 npm 패키지가 아닌가: 모듈은 프로젝트별로 **수정**되어야 한다(fork 모델, CHARTER). node_modules는 블랙박스라 부적합. shadcn처럼 소스로 들여와 내 코드로 만든다.

## 3. 카탈로그 모듈 패키징

현재 한 모듈은 4곳에 흩어져 있다 (board 기준, 0단계 매니페스트 `footprint`):
- 백엔드 `apps/core-backend/src/features/board/`
- 프론트 `apps/core-frontend/src/features/board/` (+ admin)
- Prisma `apps/core-backend/prisma/schema/board.prisma`
- 시드 `apps/core-backend/prisma/seed/board-permission.seed.ts`
- 흩어진 핀포인트 (권한 상수, 라우트 등)

카탈로그는 이 흩어진 조각을 **한 폴더에 미러링**하고, 매니페스트가 분배 경로를 안다:

```
catalog/modules/board/
  board.feature.ts          # FeatureManifest — footprint가 "어디로 분배할지"의 진실
  backend/                  # → apps/core-backend/src/features/board/
  frontend/                 # → apps/core-frontend/src/features/board/ (+ admin/boards)
  prisma/board.prisma       # → apps/core-backend/prisma/schema/board.prisma
  seed/board-permission.seed.ts  # → apps/core-backend/prisma/seed/
  permissions.ts            # → libs/shared PERMISSIONS.BOARD 병합 데이터
```

**즉 `footprint`가 양방향 매핑**: 0단계엔 "어디서 떼나"(제거), 2단계엔 "어디로 넣나"(설치). 같은 데이터.

## 4. 설치 메커니즘 — `pnpm module:add <id>`

```
1. degit org/weaver-module-catalog/modules/<id>  → 임시 디렉토리로 소스 복사
2. 매니페스트(footprint) 읽어 각 조각을 해당 위치로 분배:
   backend/ → features/<id>/, prisma → schema/<id>.prisma, seed → seed/, frontend → ...
3. 등록 codegen (5절)
4. prisma migrate dev (스키마 추가)
5. (선택) seed 실행
```

- 멱등: 이미 설치돼 있으면 "이미 설치됨" 안내(덮어쓰기 여부 확인).
- degit은 `.git` 없이 디렉토리만 가져오므로 깔끔.

## 5. 등록 자동화 (codegen) — 핵심 난점

설치 시 흩어진 등록 지점을 손으로 안 건드리려면 자동화가 필요하다. 지점별 전략:

| 등록 지점 | 자동화 방법 |
|---|---|
| `core.module.ts`의 모듈 등록 | **codegen** — `features/*/*.module.ts` 글롭하여 등록 파일(`feature-modules.generated.ts`) 재생성. 설치/제거가 디렉토리 변화만으로 반영 |
| `manifests.ts`의 `ALL_MANIFESTS` | **codegen** — `features/*/*.feature.ts` 글롭 재생성 |
| Next.js 라우트 (`app/.../boards/`) | **파일기반 자동** — app 디렉토리에 복사하면 Next가 자동 라우팅 |
| 사이드바 메뉴 | 매니페스트에 `menu?` 필드 추가 → 메뉴도 글롭/codegen |
| `PERMISSIONS.<X>` (libs/shared) | **codegen** — 각 모듈 `permissions.ts`를 글롭하여 `PERMISSIONS.generated.ts` 병합 |
| 권한그룹 시드 매핑 | 시드가 글롭으로 모듈 권한 수집 |

> 원칙: **"설치 = 파일 복사 → codegen 1회 → 끝"**. codegen은 0.5단계 추출기 인프라(ts-morph, 매니페스트)를 재사용. 글롭 가능한 건 글롭, 안 되는 건(권한 상수 병합) codegen.

## 6. 제거 메커니즘 — `pnpm module:remove <id>`

```
1. 의존 검사: analyzeRemoval(graph, id) — 하류(dependents)가 있으면 경고
   "board를 떼면 abuse-report(hard 컴파일 실패), search(soft) 영향"  (removalNotes)
2. DB 데이터 검사: footprint.prismaModels의 테이블에 row가 있으면 경고 (운영 데이터 손실, 조건1)
3. footprint 기반 파일 삭제 (features/<id>, schema, seed, frontend, routes)
4. 등록 codegen 재생성 (5절 — 글롭이 자동으로 빠짐)
5. prisma migrate dev (스키마 제거) — 데이터 손실 확정 단계
```

- 카탈로그 원본은 안 건드림 → 재설치 가능(멱등).

## 7. 빌드 · 전달 (조건2·3 자동 충족)

- **빌드**: 메인 repo의 `features/`엔 설치된 모듈만 존재 → 빌드 진입점이 그것만 등록 → 미설치는 애초에 없어 번들 제외. 별도 작업 불필요.
- **전달**: 메인 repo 자체가 "설치된 것만" → 그대로 전달하면 미설치 코드 없음. 카탈로그(별도 repo)는 전달 안 함.
- 즉 **조건2·3은 "별도 카탈로그 + 메인엔 설치된 것만"이라는 2절 구조에서 공짜로 따라온다.**

## 8. DB 처리

- 설치: 모듈 prisma 스키마 추가 → `migrate dev`로 테이블 생성.
- 제거: `prismaModels` 테이블에 데이터 있으면 **경고 + 확인**(조건1). 확인 시 스키마 제거 → `migrate dev`(테이블 DROP, 데이터 손실).
- 보일러플레이트 개발 DB(운영 데이터 없음)는 자유롭게 반복.

## 9. 대시보드 표현 (1단계 확장)

- 대시보드가 **카탈로그 인덱스**(카탈로그의 매니페스트 목록)를 조회 → 설치된 것 vs 설치 가능한 것 비교.
- **설치 모듈**: 선명 (현재)
- **미설치(카탈로그) 모듈**: 점선 유령 카드/노드(1단계 그래프의 core 점선 패턴 재사용) + "설치: `pnpm module:add shop`"
- **제거**: removalNotes + DB 데이터 경고 펼침 + "제거: `pnpm module:remove board`"
- 실제 실행은 CLI(빌드타임). 대시보드는 안내까지.

## 10. PoC 순서 (구현은 단계적)

1. **board를 카탈로그로 추출** — 흩어진 board 조각을 `catalog/modules/board/` 구조로 모으는 스크립트 (footprint 역매핑). 로컬 카탈로그 디렉토리로 시작(원격 repo는 나중).
2. **등록 codegen** — `feature-modules.generated.ts` / `ALL_MANIFESTS` / `PERMISSIONS` 글롭 재생성. 기존 수동 등록을 codegen으로 전환(동작 동일 검증).
3. **`module:remove board`** — footprint 삭제 + codegen 재생성 + DB 경고. 빌드/테스트 통과 = board 깔끔히 제거됨 검증.
4. **`module:add board`** — 카탈로그에서 복사 + codegen + migrate. 제거→재설치 왕복 멱등 검증.
5. **DB 데이터 경고**, 대시보드 미설치 표현, 원격 카탈로그 repo + degit.

## 11. 미해결 / 리스크

- **codegen vs 글롭의 webpack 호환** — NestJS nest build(webpack)에서 동적 글롭 등록 방식 검증 필요(require.context vs 빌드타임 codegen). codegen이 안전할 듯.
- **permissions 병합 codegen** — libs/shared의 PERMISSIONS를 모듈별 조각에서 병합하는 구조 재설계.
- **카탈로그 ↔ 메인의 매니페스트 동기화** — 설치 후 메인에서 모듈을 수정하면 카탈로그 원본과 분기(fork). 업데이트 전략은 후속.
- **degit private repo 인증** — 토큰/SSH.

## 관련 문서
- 0단계: docs/specs/2026-05-30-module-registry-design.md / -plan.md
- 0.5단계: docs/specs/2026-05-31-module-registry-extractor.md
- 1단계: docs/specs/2026-05-31-module-registry-dashboard.md
