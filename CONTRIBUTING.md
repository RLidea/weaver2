# Contributing to Weaver2

본 문서는 **weaver2 자체에 기여하시는 분**과 **이 보일러플레이트를 복제해서 외주 프로젝트로 운영하시는 분** 양쪽을 위한 가이드입니다.

> 핵심 철학과 코딩 스타일은 [`CLAUDE.md`](CLAUDE.md), 향후 작업은 [`ROADMAP.md`](ROADMAP.md), 종합 감사 결과는 [`docs/audits/`](docs/audits/) 참조.

---

## 📋 목차

1. [환경 셋업](#-환경-셋업)
2. [개발 워크플로우](#-개발-워크플로우)
3. [브랜치 전략](#-브랜치-전략)
4. [커밋 컨벤션](#-커밋-컨벤션)
5. [Pull Request](#-pull-request)
6. [CI 동작 이해](#-ci-동작-이해)
7. [DB 마이그레이션](#-db-마이그레이션)
8. [테스트 작성 가이드](#-테스트-작성-가이드)
9. [코드 리뷰 체크리스트](#-코드-리뷰-체크리스트)
10. [자주 발생하는 문제 (FAQ)](#-자주-발생하는-문제-faq)

---

## 🛠️ 환경 셋업

| 항목 | 버전 |
|------|------|
| Node | `>=22` (`.nvmrc` 참조) |
| pnpm | `>=11` (`packageManager` 필드 참조) |
| PostgreSQL | 16+ |

```bash
# 1. 의존성 설치 (husky 자동 init 포함)
pnpm install

# 2. .env 작성
cp apps/core-backend/.env.example apps/core-backend/.env
# DATABASE_URL, JWT_SECRET 등 필수 항목 채우기

# 3. DB 셋업
pnpm db:migrate
pnpm db:seed

# 4. 개발 서버 (각자 별도 터미널)
pnpm dev:core    # 백엔드 :4000
pnpm dev:web     # 프론트엔드 :3000
```

---

## 🔄 개발 워크플로우

### 1️⃣ 새 작업 시작

```bash
git switch main
git pull
git switch -c <type>/<short-description>
# 예: feat/user-export, fix/login-redirect, refactor/comment-tree
```

### 2️⃣ 작업 중

- **자주 커밋** — 의미 단위로 작은 커밋 권장 (5분~30분 단위가 이상적)
- **로컬 검증** — pre-commit 훅이 자동으로 secret 차단 + `pnpm test` 실행
- **prisma 변경** 후 → `pnpm db:generate`로 타입 동기화 (또는 자동으로 다음 install 시 실행)

### 3️⃣ 푸시 + PR

```bash
git push -u origin HEAD
gh pr create --fill   # 또는 GitHub UI
```

CI가 자동으로 돌고, **`CI success` 통과 후에만** 머지할 수 있습니다.

### 4️⃣ 리뷰 + 머지

- `Squash and merge` 권장 (히스토리 깔끔)
- 또는 **의미 있는 커밋 분할이 잘 되어 있으면** rebase merge

---

## 🌿 브랜치 전략

본 프로젝트는 **단순 GitHub Flow**를 따릅니다:

```
main (보호됨) ────────────────────────────────────
       ▲                ▲              ▲
       │                │              │
  feat/A   PR    fix/B     PR    refactor/C   PR
```

- `main`은 항상 배포 가능한 상태
- 모든 작업은 짧은 기간 동안 살아있는 feature branch에서
- **장기 develop/release 브랜치 없음** — 필요 시 git tag로 릴리즈

### 브랜치 이름 규칙

| 접두사 | 용도 |
|--------|------|
| `feat/` | 신기능 |
| `fix/` | 버그 수정 |
| `refactor/` | 동작 변경 없는 구조 개선 |
| `perf/` | 성능 개선 |
| `docs/` | 문서만 |
| `chore/` | 빌드·CI·의존성 |
| `test/` | 테스트만 |

`feat/login-2fa-improvements` 같이 **하이픈으로 짧게**.

---

## 📝 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/)를 따릅니다. PR 제목도 동일 규칙 — `pr-checks.yml` 워크플로우가 자동 검증합니다.

### 형식

```
<type>(<scope>): <subject>

<body 영어>

---
<body 한국어>
```

### type

| | 의미 |
|---|------|
| `feat` | 신기능 |
| `fix` | 버그 수정 |
| `refactor` | 동작 변경 없는 구조 개선 |
| `perf` | 성능 개선 |
| `test` | 테스트 추가·수정 |
| `docs` | 문서만 |
| `chore` | 빌드/설정/의존성 |
| `ci` | CI 워크플로우 |
| `style` | 포맷팅 (코드 동작 변경 없음) |
| `build` | 빌드 시스템 변경 |

### subject 규칙

- **50자 이내**, 동사 원형 또는 명사
- 영어/한국어로 시작 (`pr-checks.yml`이 검증)
- 마지막에 마침표 X
- ❌ AI 생성 표시 금지 (`Co-Authored-By: Claude` 등 — `CLAUDE.md` 참조)

### 좋은 예시

```
fix(auth): block IDOR in board-permission for anonymous users
perf(comment): flat fetch + in-memory tree build for unbounded depth
chore(deps): bump next from 16.1.6 to 16.2.6 (CVE patch)
```

### body는 "왜"

- 코드만 봐도 알 수 있는 "무엇"은 짧게
- 결정의 이유, 대안 비교, 영향 범위를 자세히

---

## 🔀 Pull Request

### 작성

- **제목**: Conventional Commits 형식 (`type(scope): subject`)
- **본문 템플릿**:

```markdown
## Summary
- 핵심 변경 1~3개

## Why
- 왜 이 변경이 필요한가
- 트레이드오프

## Test plan
- [ ] 어떻게 검증했는지 (수동·자동)

## Notes
- 리뷰어가 알면 좋을 컨텍스트 (있다면)
```

### 자동으로 일어나는 것

- `pr-checks.yml` — 제목 검증, 자동 라벨, 500줄 초과 시 분할 권유 코멘트
- `ci.yml` — 8개 job 병렬 실행 + `CI success` 통합 게이트
- `codeql.yml` — 보안 정적 분석
- `security.yml` — 의존성 변경 시 추가 audit

### 머지 조건

1. ✅ `CI success` 통과
2. ✅ Code Scanning 결과 정상
3. ✅ 리뷰 1명 이상 승인
4. ✅ 모든 conversation resolved

### 머지 방법

- **Squash and merge (기본)** — 작은 PR, 정리되지 않은 커밋
- **Rebase and merge** — 의미 있는 커밋이 잘 분할되어 있을 때
- **Merge commit** — 사용 안 함 (histroy 노이즈)

---

## 🤖 CI 동작 이해

`README.md`의 [CI / GitHub Actions](README.md#-ci--github-actions) 섹션 참조. 핵심 흐름:

```
push/PR
   ↓
[install] (pnpm cache)
   ↓
   ├─ secret-files (forbidden file 검사)
   ├─ lint
   ├─ test-unit
   ├─ test-integration (Postgres 컨테이너)
   ├─ build-backend
   ├─ build-web
   └─ prisma-check (validate + format)
   ↓
[ci-success] ← 단일 require check
```

**CI 실패 시**:

1. **lint** — 로컬에서 `pnpm lint` 후 자동 수정 → 재푸시
2. **test-unit** — 로컬에서 `pnpm test`로 동일 실행
3. **test-integration** — `.env`의 SMTP/VAPID/JWT 등 채워져 있는지 확인. 로컬에서 `pnpm test:integration:run`
4. **build-web** — `NEXT_PUBLIC_API_URL` 등 빌드 시 필요한 env 확인
5. **prisma-check** — `pnpm prisma format --schema=apps/core-backend/prisma/schema` 실행 후 재커밋

---

## 🗄️ DB 마이그레이션

### 새 마이그레이션 만들기

```bash
# 1. apps/core-backend/prisma/schema/*.prisma 수정
# 2. 마이그레이션 생성 + 로컬 적용
pnpm db:migrate
# 이름 입력: e.g., add_user_avatar_url
```

→ `apps/core-backend/prisma/schema/migrations/<timestamp>_<name>/migration.sql` 생성됨.

### 마이그레이션 적용 순서

| 환경 | 명령 |
|------|------|
| **로컬 개발** | `pnpm db:migrate` (인터랙티브) |
| **로컬 검증** | `pnpm prisma migrate deploy --schema=apps/core-backend/prisma/schema` |
| **CI/staging/prod** | `prisma migrate deploy` (자동) |
| **로컬 초기화** | `pnpm db:reset` ⚠️ 데이터 모두 삭제 |

### 위험한 변경

- **컬럼 삭제·이름 변경** — 무중단 배포 시 2단계로 분리:
  1. 새 컬럼 추가 + 양쪽 쓰기
  2. 데이터 마이그레이션 + 코드 한쪽만 사용
  3. 다음 릴리즈에서 옛 컬럼 삭제
- **인덱스 추가** — 큰 테이블이면 `CREATE INDEX CONCURRENTLY` 직접 SQL로
- **NOT NULL 추가** — DEFAULT 값 같이 두기 또는 백필 후 적용

### 롤백 정책

- Prisma는 자동 롤백을 지원하지 않음
- **down migration 직접 SQL로 작성** 후 `migration.sql.down` 파일로 함께 커밋
- 또는 새 forward migration으로 되돌리는 것이 더 안전

---

## 🧪 테스트 작성 가이드

### 테스트 종류

| 종류 | 위치 | 실행 |
|------|------|------|
| **Unit** | `**/*.spec.ts` (소스 옆) | `pnpm test` |
| **Integration** | `apps/core-backend/test/integration/**` | `pnpm test:integration` |
| **E2E (Playwright)** | `apps/core-frontend/e2e/**` | `pnpm --filter core-frontend e2e` |

### 어떤 걸 작성?

- **Unit** — 순수 로직, 분기, 검증, 변환 (DB 의존성 없는 것)
- **Integration** — DB·외부 의존 통합, 권한 가드, 트랜잭션 cascade
- **E2E** — 풀 스택 사용자 시나리오 (브라우저 → Next.js → backend → Postgres).
  새 기능이 추가하는 골든 패스 1개씩 추가가 기준. 자세한 가이드는
  [`apps/core-frontend/e2e/README.md`](apps/core-frontend/e2e/README.md)

### Mock 패턴 (이번 세션 정착됨)

```ts
// 외부 함수 mock
jest.mock('../repositories/find-user-by-email.query', () => ({
  FindUserByEmailQuery: jest.fn(),
}));

// async factory는 require-await 룰 회피용으로 Promise.resolve 사용
jest.mock('bcrypt', () => ({
  hash: jest.fn((pw: string) => Promise.resolve(`hashed:${pw}`)),
}));

// Prisma transaction 모방
prisma.$transaction = jest.fn((cb) => cb(prisma));
```

### 회귀 방지 우선순위

1. 보안 분기 (IDOR, 권한, 인증)
2. 트랜잭션·cascade
3. 자주 깨졌던 영역 (git log 참조)

---

## ✅ 코드 리뷰 체크리스트

리뷰어 시 확인할 것:

### 보안

- [ ] `@Public()`이 잘못 적용된 곳 없는가
- [ ] 권한 체크 (`@RequirePermission` / `RequirePermission`)가 누락되지 않았는가
- [ ] `where`에 `deletedAt: null`/`hiddenAt: null` 필터 빠지지 않았는가
- [ ] 새 secret 관련 env가 로그·에러 메시지에 노출되지 않는가

### 데이터 무결성

- [ ] 두 개 이상의 쓰기는 `prisma.$transaction`으로 묶였는가
- [ ] 외부 도메인을 직접 mutate하지 않고 owner 도메인의 command를 거치는가
- [ ] cascade soft-delete가 자식까지 처리되는가

### 성능

- [ ] N+1 쿼리는 없는가 (`include` 적절성)
- [ ] 새 자주 조회 컬럼에 인덱스가 있는가
- [ ] 페이지네이션은 keyset 또는 cap이 있는가

### 패턴 일관성

- [ ] `this.prisma.*`로 직접 호출 대신 repository 함수 사용
- [ ] 프론트는 `ApiClient` 사용 (`fetch` 직접 사용 X)
- [ ] 공통 컴포넌트(`DataTable`, `Tabs`, `Pagination`, `ConfirmDialog`) 활용

### 테스트

- [ ] 새 분기마다 spec 추가 또는 사유 명시
- [ ] PR 본문에 수동 검증 단계 기재

---

## ❓ 자주 발생하는 문제 (FAQ)

### Q. `pnpm install` 후 `[ERR_PNPM_IGNORED_BUILDS]` 경고가 떠요

→ `--ignore-scripts` 효과로 prisma generate 등이 안 돌아간 것. `pnpm db:generate` 한 번 실행.

### Q. `pre-commit hook` 실행이 너무 오래 걸려요

→ 현재는 `pnpm test`로 전체 단위테스트(7~8초)가 돕니다. 빨리 commit이 필요하면 `git commit --no-verify`는 **금지** (CLAUDE.md). 정 필요하면 hook을 `--changed` 기반 부분 실행으로 변경하는 PR을 올려주세요.

### Q. CI에서 `Unit tests` 통과하는데 `Integration tests`가 실패해요

→ 보통 env 누락. `ci.yml`의 `test-integration` job env에 변수 추가가 필요한지 확인. SMTP·VAPID는 더미값으로 주입하면 됩니다.

### Q. Prisma 스키마를 수정했는데 `prisma-check`가 fail해요

→ `prisma format` 자동 적용 후 재커밋:

```bash
pnpm prisma format --schema=apps/core-backend/prisma/schema
git add apps/core-backend/prisma/schema/
git commit -m "chore(db): apply prisma format"
```

### Q. CodeQL이 false-positive를 보고했어요

→ Security 탭에서 해당 finding을 `Dismiss as false positive` 처리. 같은 패턴이 반복되면 `.github/codeql/queries.yml`에 suppress 규칙 추가.

### Q. PR이 자꾸 충돌(conflict)나요

→ 잦은 base sync로 해결:

```bash
git fetch origin
git rebase origin/main
# conflict 해결 후
git push --force-with-lease
```

`--force` 대신 `--force-with-lease`를 쓰는 이유: 다른 사람이 같은 브랜치에 push했다면 덮어쓰기 방지.

### Q. 외주 협업자가 main에 직푸시해버렸어요

→ Branch ruleset 활성화 후엔 admin만 가능. 만약 사고가 났다면:

```bash
git revert <bad-sha>           # 또는 git revert --no-commit <sha>..HEAD
git push origin main
```

`reset --hard` + `push --force`는 **금지** (다른 사람이 이미 fetch했을 수 있음).

---

## 🔗 추가 리소스

- 보안 보고: [`SECURITY.md`](SECURITY.md)
- 향후 작업: [`ROADMAP.md`](ROADMAP.md)
- 핵심 코딩 가이드: [`CLAUDE.md`](CLAUDE.md), [`apps/core-frontend/CLAUDE.md`](apps/core-frontend/CLAUDE.md)
- 종합 감사 기록: [`docs/audits/`](docs/audits/)

---

`(´∀｀)b` 모르는 게 있으면 Issue로 질문해주세요. 보일러플레이트의 의도와 다른 패턴이 있다면 그것도 Issue로 남겨주시면 본 가이드를 업데이트하겠습니다.
