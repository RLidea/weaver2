# 10. 참고 (Reference)

이 장은 온보딩 가이드 전체를 통독한 뒤 "이 용어가 뭐였지?", "이 명령어가 뭐더라?" 하는 순간에 펼치는 **빠른 조회용 챕터**입니다. 새로운 개념을 설명하기보다 앞 장들의 핵심 정보를 한곳에 모아 둡니다.

---

## 10.1 용어집 (Glossary)

| 용어 | 뜻 (1~2줄) | 참고 장 |
|------|-----------|--------|
| **보일러플레이트** | 새 프로젝트를 시작할 때마다 반복해서 짓는 공통 기반을 미리 완성해 둔 출발선. weaver2는 NestJS + Next.js 커뮤니티 플랫폼용 보일러플레이트로, fork하면 코드 전체가 내 것이 된다. | [1장](01-introduction.md) |
| **모노레포(monorepo)** | 하나의 저장소(`weaver2/`) 안에 실행 앱(`apps/core-backend`, `apps/core-frontend`)과 공유 라이브러리(`libs/`)를 함께 두는 구조. pnpm workspace로 관리하고, 권한 상수처럼 양쪽이 동시에 알아야 하는 것은 `libs/shared`에 두어 단일 진실을 보장한다. | [1장](01-introduction.md), [7장](07-libs.md) |
| **백엔드 4계층** | `apps/core-backend/src/` 아래의 코드를 성격별로 나눈 네 디렉토리 — `core/`(플랫폼 토대: auth·user·permission·notification·terms), `features/`(비즈니스 기능: board·banner 등), `infrastructure/`(외부 연동: email·upload), `system/`(운영자 API: admin·health). 새 비즈니스 기능은 대부분 `features/`에 추가한다. | [1장](01-introduction.md), [3장](03-backend-fundamentals.md) |
| **CQRS 파일 분리 (`*.query.ts` / `*.command.ts`)** | Repository를 클래스가 아닌 순수 함수로 구현하되, **읽기**는 `find-*.query.ts`, **쓰기**는 `create-*.command.ts` / `update-*.command.ts` 등으로 파일을 분리하는 패턴. 파일 하나 = SQL 하나. 함수 시그니처가 `(prisma: PrismaClient \| Prisma.TransactionClient, ...)` 형태여서 트랜잭션 안팎 모두에서 동일하게 호출할 수 있다. | [3장](03-backend-fundamentals.md) |
| **PermissionGroup** | 역할(Role) 대신 쓰는 권한 묶음 단위. 사용자는 여러 그룹에 속할 수 있고, 각 그룹은 `resource:action` 형식의 권한 문자열 목록을 가진다. 시드 기본 6종: SuperAdmin / Admin / Operator / Moderator / User / Suspended. | [5장](05-auth-and-permissions.md) |
| **와일드카드** | 권한 문자열에서 `board:*`처럼 `:*`로 묶는 패턴. `hasPermission()` 검사 시 `*:*`(SuperAdmin) → `resource:*`(리소스 전체) → 정확한 문자열 순으로 해소된다. `libs/shared`의 `PERMISSIONS` 상수와 짝을 이뤄 오타 없이 사용한다. | [5장](05-auth-and-permissions.md) |
| **`@Public()`** | `JwtAuthGuard`의 secure-by-default 원칙을 뒤집는 데코레이터. 기본적으로 모든 엔드포인트는 JWT 인증이 필요하고, 비로그인 접근이 허용되어야 하는 엔드포인트에만 `@Public()`을 명시한다. 내부적으로 `isPublic: true` 메타데이터를 설정하며, 가드가 이를 읽어 토큰 검사를 건너뛴다. | [3장](03-backend-fundamentals.md), [5장](05-auth-and-permissions.md) |
| **모듈(module, module-registry 맥락)** | weaver2에서 "제거하거나 추가할 수 있는 기능 단위". 코드가 백엔드·프론트·DB 스키마·시드·권한·라우트 등 7~8곳에 흩어져 있어, 폴더 하나만 지워서는 완전히 없앨 수 없다. 현재 등록된 4개 모듈: board / abuse-report / search / banner. | [8장](08-module-registry.md) |
| **매니페스트 (`*.feature.ts`)** | 각 feature 디렉토리 안에 있는 `FeatureManifest` 객체 파일(예: `board.feature.ts`). 해당 모듈의 `id`, `layer`, `dependsOn`(의존 모듈과 강도), `footprint`(물리적 존재 지점 전체), `removalNotes`(역의존 알림)를 선언한다. 모듈의 이력서이자 자동화 도구의 입력값이다. | [8장](08-module-registry.md) |
| **footprint** | 매니페스트의 한 필드. 모듈이 실제로 자리 잡은 모든 위치를 열거한다 — `backendDir`, `frontendDirs`, `prismaSchema`, `prismaModels`, `coreBackrefs`, `permissions`, `seeds`, `routes`, `pinpoints`. | [8장](08-module-registry.md) |
| **pinpoints** | footprint 안의 한 필드. 디렉토리 단위로 지울 수 없고 다른 파일 안에 인라인으로 박혀 있는 등록 지점들의 위치 지도(예: `core.module.ts → BoardModule`, `libs/shared → PERMISSIONS.BOARD`). 모듈 제거 시 이 지점들을 추가로 수동 편집해야 한다. | [8장](08-module-registry.md) |
| **슬롯(slot)** | 프론트엔드에서 모듈이 특정 UI 위치에 컴포넌트를 주입하는 확장점. 현재 두 종류(`'dashboard-top'`, `'global-popup'`). 모듈이 `dashboard-slots.tsx`를 가지면 `gen-slot-registry.ts`가 자동 감지해 `slot-registry.generated.ts`를 생성한다. | [8장](08-module-registry.md) |
| **스킨(skin)** | CSS 변수 묶음으로 구성된 테마. `skins/default.css`·`skins/dark.css` 등 `[data-skin="{name}"]` 셀렉터 파일이 하나의 스킨이며, `skin-provider.tsx`가 `<html>` 태그에 `data-skin` 속성을 설정한다. `skins/index.ts`의 `SkinId` 유니온에 등록해야 사용 가능하다. | [6장](06-frontend.md) |
| **semantic 토큰** | 스킨이 정의하는 `--skin-*` CSS 변수를 Tailwind 클래스로 감싼 이름(예: `bg-surface`, `text-text`, `border-border`). 컴포넌트에서 색상을 직접 하드코딩하지 않고 이 클래스를 사용해야 스킨 전환 시 앱 전체 색상이 한 번에 바뀐다. | [6장](06-frontend.md) |
| **coreBackrefs** | 기능 모듈이 코어 모델(주로 `User`)에 추가하는 역참조 Prisma 관계 필드(예: `User.banners`, `User.posts`). `auth.prisma`의 `User` 모델에 직접 선언되며, 해당 기능의 `FeatureManifest.footprint.coreBackrefs`에도 등록해야 모듈 제거 스크립트가 자동으로 정리한다. | [4장](04-data-layer.md), [8장](08-module-registry.md) |
| **ApiClient** | 프론트엔드에서 `fetch()`를 직접 쓰는 대신 반드시 사용해야 하는 싱글톤 래퍼(`infrastructure/api-client.ts`). CSRF 토큰 자동 관리, 401 시 토큰 갱신 큐, FormData 자동 판별 기능을 내장한다. `features/{domain}/api/{domain}.api.ts`에서만 참조하고, 컴포넌트나 훅에서 직접 호출하지 않는다. | [6장](06-frontend.md) |
| **keyset 페이지네이션** | 마지막 row의 키 이후만 읽는 커서 기반 페이지네이션 방식. OFFSET 방식 대비 대용량에서도 성능이 일정하고, 중간에 데이터가 삽입되어도 중복·누락이 없다. `libs/pagination`의 `KeysetPaginationService.paginate()`로 사용하며, `preset`으로 정렬 기준을 선택한다. | [4장](04-data-layer.md), [7장](07-libs.md) |
| **`STORAGE_DRIVER`** | 파일 저장 드라이버를 전환하는 환경변수. `local`(기본값, 로컬 디스크)과 `s3`(AWS S3 / MinIO) 두 값을 지원한다. `libs/upload`의 `UploadModule`이 이 값을 읽어 `StorageProvider` 구현체를 교체한다. | [1장](01-introduction.md), [7장](07-libs.md) |
| **`NOTIFICATION_EMITTER`** | 알림 발송 구현체를 주입하는 NestJS DI 토큰. 현재는 인메모리 `EventEmitter2` 기반이며, 토큰으로 추상화되어 있어 나중에 Redis Pub/Sub 등으로 교체할 수 있다. 알림 이벤트(`notification.created`)가 발생하면 DB 저장 + SSE 실시간 전송 + 웹 푸시(VAPID) 순으로 흐른다. | [1장](01-introduction.md) |

---

## 10.2 자주 막히는 곳 FAQ

### Q1. `pnpm install`이 빨간 메시지와 함께 끝났어요 — 실패인가요?

```
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: @nestjs/core, esbuild, sharp, prisma, ...
```

**실패가 아닙니다.** pnpm v11의 보안 정책이 native 빌드 스크립트를 기본 보류한 것이고, 패키지 설치는 정상 완료된 상태입니다. weaver2는 `package.json`의 `onlyBuiltDependencies`에 `sharp`만 빌드를 허용하고, Prisma는 별도 `pnpm db:generate`로 처리합니다. **그냥 다음 단계로 진행하면 됩니다.**

> ⚠️ **`pnpm approve-builds`를 실행하지 마세요.** 실행하면 빌드 허용 목록이 `package.json`에 추가되어 팀 정책(`sharp`만)이 바뀌고, 저장소에 의도치 않은 변경이 커밋될 수 있습니다.

---

### Q2. `pnpm init` 중 DATABASE_URL 확인에서 멈춥니다.

`init`은 내부적으로 `DATABASE_URL`이 채워졌는지 확인하고, **아직 안 채워진 경우 안내만 출력하고 정지합니다.** 이것은 정상 동작입니다.

`apps/core-backend/.env`를 열어 `DATABASE_URL`을 채우고(Docker를 쓴다면 `postgresql://weaver:weaver1234@localhost:5432/weaver2`), DB가 떠 있는 상태에서 `pnpm init`을 **다시** 실행하면 `db:generate → db:migrate → db:seed`까지 자동으로 완료됩니다.

---

### Q3. 첫 커밋이 `husky pre-commit`에 막혀요.

pre-commit 훅이 `pnpm test`를 실행하고, 테스트 환경의 의존성 동기화 과정이 위 Q1의 빌드 보류(`ERR_PNPM_IGNORED_BUILDS`)에 걸려 exit 1로 막힐 수 있습니다. weaver2 CI는 `HUSKY=0`으로 우회합니다.

- **문서·설정 변경 커밋**: `git commit --no-verify`로 훅을 건너뛰어도 안전합니다.
- **코드 변경 커밋**: `pnpm test`를 직접 돌려 통과를 확인한 뒤 `git commit --no-verify`를 쓰세요.

---

### Q4. `pnpm dev`와 `pnpm dev:web`의 차이는 무엇인가요?

| 명령어 | 대상 | 포트 |
|--------|------|------|
| `pnpm dev` | 백엔드(NestJS) — 프로젝트 선택 프롬프트 → `core-backend` 선택 | 4000 |
| `pnpm dev:web` | 프론트엔드(Next.js) — `gen:slots` 후 dev 서버 기동 | 3000 |

두 명령은 **각각 별도 터미널에서** 실행해야 합니다. `pnpm dev`만 돌리면 백엔드 API만 뜨고 웹 화면이 없고, `pnpm dev:web`만 돌리면 API 호출이 실패합니다.

---

### Q5. `pnpm db:migrate`와 `prisma migrate deploy`는 언제 구분해서 쓰나요?

| 명령어 | 용도 | 동작 |
|--------|------|------|
| `pnpm db:migrate` (= `migrate dev`) | **로컬 개발** | 새 마이그레이션 파일을 생성하고 적용. 스키마 변경이 있을 때 사용. |
| `prisma migrate deploy` | **프로덕션 배포** | 미적용 마이그레이션 파일만 적용. 새 파일을 생성하지 않음. |

로컬에서 `prisma migrate deploy`를 쓰면 의도치 않은 동작이 발생할 수 있습니다. 로컬 개발에서는 **항상 `pnpm db:migrate`**를 씁니다.

---

### Q6. 권한을 바꿨는데 API에 반영이 안 돼요.

`PermissionService`는 LRU 인메모리 캐시를 씁니다. 기본 TTL이 300초(5분)이라서 권한을 변경해도 즉시 반영되지 않을 수 있습니다. 개발 중에는 `apps/core-backend/.env`에 아래를 설정하면 캐시를 끌 수 있습니다.

```env
PERMISSION_CACHE_STRATEGY=none
```

---

## 10.3 명령어 모음

루트 `package.json`의 `scripts`를 기준으로 정리합니다. 앱·DB·모듈·품질 네 범주로 나눕니다.

### 앱 실행

| 명령어 | 실제 동작 | 용도 |
|--------|----------|------|
| `pnpm init` | `scripts/init.sh` 실행 — `.env` 생성 → `pnpm install` → DB 준비(DATABASE_URL 있을 때) | **처음 클론 후 초기화** |
| `pnpm dev` | `scripts/run-project.sh dev` — 프로젝트 선택 후 NestJS watch 모드 기동 | 백엔드 개발 서버 실행 |
| `pnpm dev:web` | `gen:slots` 후 `core-frontend` dev 서버 기동 (포트 3000) | 프론트엔드 개발 서버 실행 |
| `pnpm dev:core` | `nest start core-backend --watch` | 백엔드만 직접 watch 기동 (선택 프롬프트 없음) |
| `pnpm build` | `scripts/run-project.sh build` — 프로젝트 선택 후 빌드 | 앱 프로덕션 빌드 (선택형) |
| `pnpm build:web` | `gen:slots` 후 `core-frontend` 빌드 | 프론트엔드 프로덕션 빌드 |
| `pnpm build:core` | `nest build core-backend` | 백엔드 프로덕션 빌드 |
| `pnpm gen:slots` | `scripts/gen-slot-registry.ts` 실행 | 슬롯 레지스트리 파일 재생성 (`dev:web`이 자동 실행) |

### 데이터베이스

| 명령어 | 실제 동작 | 용도 |
|--------|----------|------|
| `pnpm db:generate` | `prisma generate --schema=apps/core-backend/prisma/schema` | 스키마 변경 후 Prisma Client 타입 재생성 |
| `pnpm db:migrate` | `prisma migrate dev --schema=...` | 로컬 개발용 마이그레이션 파일 생성 + 적용 |
| `pnpm db:reset` | `prisma migrate reset --schema=...` | DB 초기화 → 전체 마이그레이션 재적용 → 시드 재실행 |
| `pnpm db:seed` | `ts-node ... apps/core-backend/prisma/seed/seed.ts` | 권한 그룹·기본 관리자·이메일 템플릿 등 시드 데이터 삽입 |

> 📌 세 명령 모두 `dotenv -e apps/core-backend/.env`가 앞에 붙어 앱 디렉토리의 `.env`를 읽습니다. `DATABASE_URL`이 없으면 실패합니다.

### 테스트

| 명령어 | 실제 동작 | 용도 |
|--------|----------|------|
| `pnpm test` | `scripts/run-test.sh test` | 유닛 테스트 전체 실행 |
| `pnpm test:watch` | `scripts/run-test.sh watch` | 파일 변경 감지 후 자동 재실행 |
| `pnpm test:cov` | `scripts/run-test.sh cov` | 커버리지 리포트 포함 실행 |
| `pnpm test:e2e` | `scripts/run-test.sh e2e` | e2e 테스트 실행 (시드 관리자 계정 필요) |
| `pnpm test:integration` | `scripts/run-test.sh integration` | 통합 테스트 실행 |

### 모듈 레지스트리

| 명령어 | 실제 동작 | 용도 |
|--------|----------|------|
| `pnpm manifest:gen <featureId>` | `scripts/module-registry/generate.ts <featureId>` 실행 | 단일 feature의 매니페스트 추출 초안을 출력 (**featureId 인수 필수** — 누락 시 에러) |
| `pnpm manifest:verify` | jest로 `manifest-extract` 테스트 실행 | 추출기 검증 |
| `pnpm module:extract <id>` | `scripts/module/extract.ts` — footprint 파일을 `catalog/modules/<id>/`에 미러 복사 | 모듈 제거 전 카탈로그 스냅샷 저장 |
| `pnpm module:remove <id>` | `scripts/module/remove.ts` — 등록 해제 → 파일 삭제 → 슬롯 재생성 | 모듈 제거 (현재 `banner`만 완전 지원, 8장 참조) |
| `pnpm module:add <id>` | `scripts/module/add.ts` — 카탈로그에서 복원 → 등록 삽입 → 슬롯 재생성 | 모듈 복원 (현재 `banner`만 완전 지원) |

> ⚠️ `module:remove`는 git 워킹트리가 청결해야 실행됩니다(`assertCleanWorktree`). 완료 후 빌드(`pnpm build:core` / `build:web`)로 앵커 skip 여부를 확인하세요. *(별도 `typecheck` 스크립트는 없습니다.)*

### 품질

| 명령어 | 실제 동작 | 용도 |
|--------|----------|------|
| `pnpm lint` | `eslint "{src,apps/core-backend,libs,test}/**/*.ts" --fix` | ESLint 검사 + 자동 수정 |
| `pnpm format` | `prettier --write "apps/core-backend/**/*.ts" "libs/**/*.ts"` | Prettier 포매팅 적용 |
| `pnpm audit:json` | `pnpm audit --json --no-optional` | 의존성 보안 감사 결과를 JSON으로 출력 |

---

## 10.4 관련 문서 안내

weaver2 루트에는 온보딩 가이드 외에 목적이 다른 문서들이 있습니다. 역할이 겹쳐 보이지만, "무엇을 알고 싶은가"에 따라 펼치는 문서가 달라집니다.

| 문서 | 성격 | 언제 보나 |
|------|------|----------|
| [`README.md`](../../README.md) | **레퍼런스** — 기능 카탈로그, API 엔드포인트, 환경변수 전체 목록, 명령어 | "이 기능이 있나?", "이 환경변수가 뭐지?" |
| [`CHARTER.md`](../CHARTER.md) | **헌장** — 설계 의도, 범위, 원칙, 기술 선택 이유 | "왜 이렇게 짰지?", "이 선택의 트레이드오프는?" |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | **워크플로우** — 브랜치 전략, 커밋 컨벤션, PR 절차, 코드 리뷰 체크리스트 | 코드를 올릴 때, PR을 낼 때 |
| [`CLAUDE.md`](../../CLAUDE.md) | **코딩 철학** — 필수 패턴, 절대 금지 사항(fetch 직접 사용 등), AI 협업 규칙 | 코드 스타일·규칙을 확인할 때 |
| [`SECURITY.md`](../SECURITY.md) | **보안 정책** — 지원 버전, 취약점 보고 방법(비공개 GitHub Advisory) | 보안 이슈를 발견했을 때 |
| [`ROADMAP.md`](../ROADMAP.md) | **다음 단계** — 외주·서비스 전환 시 권장 추가 작업(Dependabot, Redis, 모니터링 등) | 프로젝트를 실제 서비스로 전환할 때 |
| [`docs/specs/`](../specs/) | **설계 1차 자료** — module-registry 설계서, 슬롯 시스템 설계, PoC 계획 등 날짜 기반 spec 파일 | 특정 기능의 깊은 설계 배경이 필요할 때 |

### CHARTER.md에서 꼭 짚어 둘 두 절

**§5.1 — 일반화 4렌즈 ("pull, not push")**
새 코드를 어디에 둘지, `libs/`에 올려야 할지를 판단하는 원칙입니다. 요지는 "두 번째·세 번째 실제 사용 사례가 끌어당길 때 승격하라(Rule of Three)"입니다. 아직 없는 수요를 상상해서 미리 추상화하는 것을 경계합니다. 이 원칙이 현재 `libs/` 6개 패키지가 그 자리에 있는 이유이고, feature 코드가 `apps/` 안에 머무는 이유입니다.

**§8 — module-registry 한계 명시**
CHARTER는 module-registry를 "합리적 절반"(타입·그래프·슬롯 생성기 — 완전 범용)과 "과도한 절반"(`scripts/module/lib/registration.ts` — banner 전용 하드코딩)으로 나누어 솔직하게 평가합니다. `pnpm module:add` / `module:remove`가 현재 banner에만 완전히 동작하는 것은 버그가 아니라 §5.1 Rule of Three에 따른 **의도된 미완성**입니다. 범용화는 두 번째 실제 모듈 분리 요구가 생길 때로 미뤄져 있으며 ROADMAP에 명시되어 있습니다.

---

→ [처음으로 — 온보딩 목차](README.md)
