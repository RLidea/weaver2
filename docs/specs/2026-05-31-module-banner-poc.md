# Module Registry 2단계 PoC — Banner 모듈 설치/제거 왕복

> 작성일: 2026-05-31
> 선행: 0단계(매니페스트·빌더), 0.5단계(추출기·verify), 1단계(대시보드), 2단계 설계(카탈로그)
> 브랜치: feat/module-registry
> 성격: 2단계 카탈로그 메커니즘의 **첫 PoC**. board 대신 **깨끗한 신규 모듈(banner)** 로
>        "별도 장소에 둔 모듈 → 설치 → 제거" 라이프사이클을 실제로 굴려본다.

---

## 1. 목적

2단계 카탈로그 스펙(`2026-05-31-module-catalog.md`)을 본격 구현하기 전에, **설치/제거 왕복을
체험·검증할 깨끗한 피험체**를 먼저 만든다.

스펙 10절 PoC 1번은 "board를 카탈로그로 추출"이지만, board는 첫 검증 대상으로 부적합하다:

- `dependsOn` 4개 (auth·permission·upload·notification)
- prisma 모델 7개 + User 역참조 4개
- **abuse-report가 board를 hard로 역의존** (moderation.service가 board 커맨드를 직접 import)
  → board를 떼면 컴파일이 깨진다
- pinpoints 6곳

이 상태로 왕복을 검증하면 "메커니즘 버그"인지 "board 고유 복잡도"인지 구분되지 않는다.
그래서 PoC 대상을 board → **banner** 로 치환한다. banner는 다음을 만족하도록 설계한다:

- **인바운드 hard 의존 0** — 아무 모듈도 banner를 import하지 않음 → 제거해도 컴파일 무손상
- footprint 슬롯을 골고루 채움(backend·frontend·admin·prisma·seed·permissions·routes) → 메커니즘 전 경로 검증
- 실제 제품에 쓸모 있음(배너/팝업 노출) → 실용 + 검증 겸용

## 2. 결정 사항 (합의 완료)

| 항목 | 결정 |
|---|---|
| 모듈 도메인 | 배너/팝업 (Banner) |
| 기능 범위 | 표준 — 배너+팝업, 이미지·링크·slot·활성토글·정렬·게시기간, 팝업 "오늘 그만보기" 쿠키 |
| 설치/제거 수준 | **최소 로컬 스크립트** — 로컬 catalog/ + degit 없이 로컬 복사, footprint 기반 분배/삭제 + 등록 codegen 최소. 원격 repo·degit·DB자동경고는 후속 |
| 시작 지점 | **메인에서 개발 → 추출** — 메인에 정상 개발/동작확인 → catalog로 추출 → remove → add 재설치 |
| createdBy(작성자 추적) | **포함** — `User.banners` backref 1개 생성. coreBackrefs 처리도 카탈로그 메커니즘의 일부라 검증 가치 + 실용성 |

## 3. 전체 그림 (2 Phase)

```
Phase 1 — 배너 모듈 개발 (메인 프로젝트)
  apps/core-backend/src/features/banner/          (Nest 모듈 + CQRS CRUD)
  apps/core-frontend/src/features/banner/         (공개 노출 컴포넌트)
  apps/core-frontend/src/features/admin/banners/  (관리자 CRUD UI)
  prisma/schema/banner.prisma                      (Banner 모델 + BannerSlot enum)
  prisma/seed/banner-permission.seed.ts            (권한 시드)
  banner.feature.ts                                (매니페스트 — footprint 진실)
  → 동작 확인 (관리자 등록 → 사용자 화면 노출)

Phase 2 — 라이프사이클 왕복 (최소 스크립트)
  1. extract:  footprint 역매핑으로 catalog/modules/banner/ 미러 복사 (1회)
  2. codegen:  feature-modules.generated.ts / manifests.generated.ts / PERMISSIONS.generated.ts
               글롭 재생성 — banner의 수동 등록을 codegen으로 전환(제거 시 자동으로 빠지게)
  3. remove:   pnpm module:remove banner → footprint 기반 파일 삭제 + codegen 재생성
               → 빌드·타입체크 통과하면 "깨끗이 제거됨" 검증
  4. add:      pnpm module:add banner → catalog에서 로컬 복사 + codegen 재생성
               → 제거 전과 동일 동작하면 "왕복 멱등" 검증
```

핵심 설계 의도:

- **인바운드 hard 의존 0** — board(abuse-report가 import)와 달리 banner는 아무도 import하지 않게
  짓는다. 그래야 remove가 컴파일을 안 깨고, 이것이 왕복 검증의 전제다.
- **등록을 codegen으로** — 수동 import 라인 삽입/삭제는 깨지기 쉽다. 글롭 재생성으로
  "제거하면 등록도 자동으로 빠진다"를 성립시킨다.

## 4. 데이터 모델 (`prisma/schema/banner.prisma`)

```prisma
model Banner {
  id          String     @id @default(uuid())
  title       String
  imageFileId String                              // @weaver2/upload File 참조 (url은 서비스에서 조회)
  linkUrl     String?
  slot        BannerSlot @default(MAIN_TOP)
  isActive    Boolean    @default(true)
  sortOrder   Int        @default(0)
  startsAt    DateTime?                           // null = 즉시
  endsAt      DateTime?                           // null = 무기한
  createdById String
  createdBy   User       @relation(fields: [createdById], references: [id])
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  deletedAt   DateTime?                           // soft-delete (운영데이터 경고 검증에도 활용)
  @@index([slot, isActive, sortOrder], map: "banner_slot_idx")
  @@map("banners")
}

enum BannerSlot { MAIN_TOP  MAIN_BOTTOM  SIDEBAR  POPUP }   // POPUP = 모달 노출
```

- `slot` 하나로 배너/팝업 통합 (별도 `type` 필드 없이 YAGNI). POPUP slot이면 프론트가 모달로 렌더.
- 팝업 "오늘 그만보기"는 프론트 localStorage — 모델 불필요.
- `createdBy` → auth.prisma의 User 모델에 `banners Banner[]` backref 1개 추가 (coreBackrefs).
- `imageFileId`는 upload 모듈 File을 id 문자열로 참조 (모듈 경계상 relation 미설정, url은 서비스에서 조회).

## 5. 권한 (`PERMISSIONS.BANNER`)

- `banner:manage` — 관리자 CRUD. 공개 조회는 권한 불필요.
- 세분화(create/update/delete) 없이 manage 하나 — 표준 범위.

## 6. API (기존 features의 CQRS 패턴 준수)

| 구분 | 엔드포인트 | 권한 |
|---|---|---|
| 관리자 | `POST /v1/admin/banners` | `banner:manage` |
| 관리자 | `GET /v1/admin/banners` (목록, 페이지네이션) | `banner:manage` |
| 관리자 | `GET /v1/admin/banners/:id` | `banner:manage` |
| 관리자 | `PATCH /v1/admin/banners/:id` | `banner:manage` |
| 관리자 | `DELETE /v1/admin/banners/:id` (soft-delete) | `banner:manage` |
| 공개 | `GET /v1/banners?slot=MAIN_TOP` (활성 & 기간유효, sortOrder순) | 없음 |

## 7. 프론트엔드

- **admin/banners**: WeaverDataTable 목록 + 등록/수정 폼(이미지 업로드 → upload API, slot select,
  게시기간 datepicker, 활성 토글, 정렬). 글래스모피즘.
- **features/banner**: 공개 노출
  - `<BannerSlot slot="MAIN_TOP" />` — 인라인 배너 (ApiClient로 `GET /v1/banners`)
  - `<PopupBanner />` — slot=POPUP, localStorage "오늘 그만보기" 처리
- 공개 배너는 라우트가 아니라 **컴포넌트**로 기존 페이지(메인 레이아웃 등)에 삽입.
  → routes footprint는 admin만, 공개는 컴포넌트.

## 8. footprint (`banner.feature.ts`)

```
id:            'banner'
layer:         'features'
dependsOn:     auth(hard), permission(hard), upload(hard, 이미지)
footprint:
  backendDir:    apps/core-backend/src/features/banner
  frontendDirs:  [apps/core-frontend/src/features/banner,
                  apps/core-frontend/src/features/admin/banners]
  prismaSchema:  apps/core-backend/prisma/schema/banner.prisma
  prismaModels:  [Banner]
  coreBackrefs:  [User.banners]
  permissions:   [PERMISSIONS.BANNER]
  seeds:         [apps/core-backend/prisma/seed/banner-permission.seed.ts]
  routes:        [apps/core-frontend/src/app/(admin)/admin/banners]
  pinpoints:     core.module.ts → BannerModule
                 admin-api.module.ts → BannerModule
                 proxy.ts → /banners
                 permission-group.seed.ts → PERMISSIONS.BANNER.*
                 libs/shared/src/index.ts → PERMISSIONS.BANNER
                 libs/common/.../permissions.const.ts → banner:manage
removalNotes:  []   ← 의도적 self-contained. 인바운드 hard/soft 의존 0 (board와 정반대)
```

## 9. 카탈로그 구조 (로컬, degit 없이)

```
catalog/modules/banner/
  banner.feature.ts          # footprint = 어디로 분배할지의 진실
  backend/                   # → features/banner/
  frontend/                  # → features/banner/ + admin/banners/
  prisma/banner.prisma       # → schema/banner.prisma
  seed/banner-permission.seed.ts
  permissions.ts             # → PERMISSIONS.BANNER 병합 데이터
```

## 10. 등록 codegen (스펙 5절 — 최소 도입)

| 등록 지점 | 방식 |
|---|---|
| Nest 모듈 등록 | `feature-modules.generated.ts` — `features/*/*.module.ts` 글롭 재생성 |
| `ALL_MANIFESTS` | `manifests.generated.ts` — `features/*/*.feature.ts` 글롭 재생성 |
| `PERMISSIONS.BANNER` | 각 모듈 `permissions.ts` 글롭 → `PERMISSIONS.generated.ts` 병합 |

- **빌드타임 codegen**(git에 커밋되는 .ts 파일) 방식 → nest build(webpack)에서 동적 글롭 없이 안전
  (스펙 11절 webpack 호환 리스크 회피).
- 설치/제거는 "디렉토리 변화 → codegen 1회 재생성"으로 반영.
- PERMISSIONS 전면 병합 재설계는 후속. 이번 PoC는 banner 범위에서 성립하는 최소 codegen으로 시작.

## 11. 스크립트 (`scripts/module/`, tsx 실행, 0.5단계 ts-morph 인프라 재사용)

```
pnpm module:extract banner   # 메인 → catalog 미러 복사 (footprint 역매핑) [Phase 2-1, 1회]
pnpm module:remove  banner   # footprint 기반 삭제 + codegen 재생성
pnpm module:add     banner   # catalog → 메인 복사 + codegen 재생성
```

- **DB(migrate)는 스크립트에서 분리** — remove/add 스크립트는 *파일·codegen까지만* 처리하고,
  `prisma migrate dev`는 안내 출력 후 **사용자가 직접 실행**한다. DB 스키마 DROP은 데이터 손실이라
  파괴적 작업은 항상 수동 확인(워크플로우 규칙).

## 12. 검증 방법 (왕복 멱등)

1. `remove` 후 → `pnpm -w typecheck` & `nest build` 통과 + `grep -ri banner apps/*/src` 잔여 0
2. `add` 후 → 관리자에서 배너 등록 → 공개 슬롯/팝업 노출이 제거 전과 동일
3. `add → remove → add` 2회 반복해도 무탈 (멱등 확정)

## 13. 범위 밖 (후속)

- 원격 카탈로그 private repo + degit 인증
- DB 데이터 존재 시 제거 경고(조건1 자동화), migrate 자동 연동
- 대시보드 미설치(유령 카드) 표현 (스펙 9절)
- PERMISSIONS 전면 글롭 병합 재설계
- 카탈로그 ↔ 메인 매니페스트 동기화(fork 후 업데이트 전략)

## 관련 문서

- 2단계 카탈로그 설계: `docs/specs/2026-05-31-module-catalog.md`
- 0단계: `docs/specs/2026-05-30-module-registry-design.md` / `-plan.md`
- 0.5단계: `docs/specs/2026-05-31-module-registry-extractor.md`
- 1단계: `docs/specs/2026-05-31-module-registry-dashboard.md`
