# Weaver2

NestJS + Next.js 기반의, 타입 안전하고 안정적인 **범용 레코드-CRUD 기반 + 배터리** 보일러플레이트입니다. 인증·권한·첨부·알림·검색·관리자·보안 등 어떤 도메인에도 필요한 공통 기반을 갖췄으며, 게시판·신고 같은 커뮤니티 기능은 그 위에 얹은 **레퍼런스 예시**입니다. 프로덕션 수준의 pnpm 모노레포 구조로 설계되었습니다.

## 🚀 주요 기능

### 인증 & 사용자
- **이메일/비밀번호 로그인·회원가입** — JWT HttpOnly 쿠키 기반, 이메일 인증
- **OAuth 소셜 로그인** — Google, Kakao, Naver (native fetch, passport 미사용)
- **2단계 인증(2FA)** — TOTP(Google Authenticator 등) + 이메일 OTP 선택 지원
- **계정 잠금** — 로그인 5회 실패 시 15분 잠금
- **세션 관리** — 기기별 RefreshToken 조회·삭제, 비밀번호 변경 시 전체 세션 무효화
- **이메일 변경** — 새 이메일로 인증 코드 발송 후 적용
- **OAuth 연결 관리** — 연동된 소셜 계정 목록 조회·해제

### 게시판
- **게시판·게시글·댓글 CRUD** — Keyset 기반 무한스크롤 페이지네이션
- **대댓글** — `parentId` 자기참조 트리(백엔드 깊이 제한 없음, UI는 댓글→답글 2단계), 소프트 삭제
- **파일 첨부** — 게시글 생성·수정 시 파일 업로드/삭제
- **고정 게시글** — 쿼리 분리 패턴으로 상단 고정
- **카테고리 필터링** — 게시판별 카테고리 탭/칩 UI
- **리액션 시스템** — 이모지 기반 게시글 반응

### 알림
- **SSE 실시간 알림** — 로그인 상태에서 댓글·답글·리액션 즉시 수신
- **웹 푸시 알림** — Service Worker + VAPID 기반, 브라우저 닫힌 상태에서도 수신
- **알림 목록** — 미읽음 카운트, 전체/개별 읽음 처리

### 검색
- **통합 검색** — 게시글·댓글 전문 검색 (PostgreSQL 풀텍스트 + GIN 인덱스)
- **필터링** — 게시판별, 타입별(게시글/댓글) 필터
- **URL 상태 관리** — 검색 조건이 URL에 유지되어 공유 가능

### 신고/모더레이션
- **다형 신고** — 게시글·댓글·사용자·미디어 신고
- **콘텐츠 제재** — 숨김·삭제, 동일 대상 신고 자동 처리
- **사용자 제재** — 경고·정지(기간 지정), 로그인 시 정지 계정 차단
- **권한 분리** — Moderator(숨김·경고) / Operator(삭제·정지) / Admin(전체)

### 관리자
- **대시보드** — 사용자·게시글·댓글 통계
- **사용자 관리** — 목록 조회, 정지·복구
- **콘텐츠 관리** — 게시글·댓글 관리
- **권한 그룹** — 그룹별 세분화된 퍼미션 관리
- **신고 처리** — 신고 목록 조회·처리·기각
- **이메일 템플릿** — 발송 템플릿 내용·활성화 관리
- **시스템 설정** — KV 스토어 기반 런타임 설정 변경
- **약관 관리** — 버전 관리·동의 이력

### 인프라
- **파일 업로드** — Local 또는 S3(MinIO 호환) 드라이버 전환 가능
- **썸네일 생성** — sharp 기반 자동 리사이징
- **이메일** — SMTP, DB 템플릿 관리, 발송 로그·재발송
- **Rate Limiting** — 전역 + 민감 엔드포인트별 강화 적용

---

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | NestJS, TypeScript, Prisma ORM |
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Database | PostgreSQL |
| Auth | JWT (HttpOnly Cookie), Passport 없이 native OAuth |
| Realtime | SSE (Server-Sent Events), Web Push (VAPID) |
| Storage | Local / AWS S3 (환경변수로 전환) |
| Email | Nodemailer (SMTP) |
| Docs | Swagger / OpenAPI |
| CI | ESLint, Prettier, Husky pre-commit |

---

## 📂 프로젝트 구조

```
weaver2/
├── apps/
│   ├── core-backend/          # NestJS API 서버 (port 4000)
│   │   ├── prisma/schema/     # 도메인별 분리된 Prisma 스키마
│   │   └── src/
│   │       ├── core/          # 프레임워크 기능 (auth, user, notification, permission, terms)
│   │       ├── features/      # 비즈니스 기능 (board, report, search)
│   │       ├── infrastructure/# 인프라 (email, upload, config)
│   │       └── system/        # 관리자 API
│   └── core-frontend/         # Next.js 웹 앱 (port 3000)
│       └── src/
│           ├── app/           # 라우팅 (App Router)
│           ├── features/      # 도메인별 슬라이스
│           ├── shared/        # 공통 UI 컴포넌트
│           └── infrastructure/# ApiClient, Providers
├── libs/
│   ├── common/                # 전역 데코레이터, 인터셉터, 필터
│   ├── email/                 # Nodemailer 래퍼
│   ├── pagination/            # Keyset 페이지네이션 라이브러리
│   ├── prisma/                # PrismaService 모듈
│   ├── shared/                # PERMISSIONS 상수, hasPermission() (백·프론트 공용)
│   └── upload/                # StorageProvider 인터페이스, Local/S3 구현
└── scripts/                   # 유틸리티 스크립트
```

> **새 엔티티(CRUD) 추가**: [.agents/skills/weaver-crud-recipe/SKILL.md](.agents/skills/weaver-crud-recipe/SKILL.md) 레시피를 따른다 — 표준 세트 정의·미러링 포인터·경계선. 배경은 [CHARTER §5.1](CHARTER.md).

---

## 🚀 시작하기

### 0. 사전 요구사항

| 도구 | 버전 | 비고 |
|------|------|------|
| Node.js | >= 22 | `.nvmrc` 제공 — `nvm use` |
| pnpm | >= 11 | `corepack enable` 권장 |
| PostgreSQL | 16 | 직접 설치 또는 아래 Docker로 구동 |

### 1. 데이터베이스 준비

로컬에 PostgreSQL이 없다면 docker-compose로 DB만 띄웁니다:
```bash
docker-compose up -d db
```
기본 접속 정보(`weaver` / `weaver1234` / DB `weaver2`)는 `.env.example`의 `DATABASE_URL` 기본값과 일치하므로 그대로 사용할 수 있습니다. 별도 PostgreSQL을 쓴다면 다음 단계에서 `DATABASE_URL`을 맞춰주세요.

### 2. 초기화

```bash
pnpm run init
```
`.env` 생성 → 의존성 설치 → **Prisma 클라이언트 생성** → 마이그레이션 → 시드까지 한 번에 수행합니다.

수동으로 진행하려면 (순서 중요 — `db:generate`를 건너뛰면 시드·서버 기동이 실패합니다):
```bash
cp apps/core-backend/.env.example apps/core-backend/.env
cp apps/core-frontend/.env.example apps/core-frontend/.env.local
pnpm install
pnpm db:generate   # Prisma 클라이언트 생성
pnpm db:migrate    # 마이그레이션
pnpm db:seed       # 시드 (권한 그룹, 기본 계정, 이메일 템플릿 등)
```

### 3. 환경 변수 확인

`apps/core-backend/.env`에서 최소 아래 항목을 확인합니다:

| 항목 | 필수 | 미설정 시 |
|------|------|-----------|
| `DATABASE_URL` | ✅ | DB 연결 실패 (docker-compose db 사용 시 기본값 그대로) |
| `JWT_SECRET` | ✅ | 로그인 등 인증 동작 안 함 — `.env` 주석의 생성 명령 참고 |
| `SMTP_*` | 선택 | 서버는 부팅되지만 이메일 발송(회원가입 인증 메일 등) 비활성화 |
| `VAPID_*` | 선택 | 웹 푸시만 비활성화 — 생성 명령은 `.env.example` 주석 참고 |
| `STORAGE_DRIVER` | 선택 | 기본 `local` (S3 사용 시 `s3`) |

### 4. 개발 서버 실행
```bash
pnpm dev:core   # 백엔드 (port 4000)
pnpm dev:web    # 프론트엔드 (port 3000) — 별도 터미널
```
> `pnpm dev`는 실행할 앱을 고르는 **대화형 선택 메뉴**를 띄웁니다. 특정 앱을 바로 띄우려면 위의 `dev:core` / `dev:web`을 사용하세요.

### 5. 확인
| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost:3000 |
| API 서버 | http://localhost:4000 |
| Swagger | http://localhost:4000/docs |

시드 기본 계정 (비밀번호는 모두 `secret!!`):

| 이메일 | 역할 |
|--------|------|
| `admin@weaver.com` | 관리자 (Admin) |
| `operator@weaver.com` | 운영자 (Operator) |
| `moderator@weaver.com` | 모더레이터 (Moderator) |
| `weaver@weaver.com` | 일반 사용자 |

> ⚠️ 실제 배포 시에는 시드 계정 비밀번호를 반드시 교체하세요 ([CHARTER §9 분기 체크리스트](CHARTER.md) 참고).

---

## 🔌 주요 API 엔드포인트

모든 경로는 `/v1` 프리픽스를 포함합니다.

### 인증
```
POST /v1/auth/sign-in                    # 로그인
POST /v1/auth/sign-up/email              # 이메일 회원가입
POST /v1/auth/refresh                    # 토큰 갱신
POST /v1/auth/sign-out                   # 로그아웃
POST /v1/auth/password/request-reset     # 비밀번호 재설정 요청
POST /v1/auth/password/reset             # 비밀번호 재설정
GET  /v1/auth/oauth/:provider            # OAuth 시작 (google|kakao|naver)
POST /v1/auth/2fa/authenticate           # 2FA 최종 인증
POST /v1/auth/2fa/email/send             # 이메일 OTP 발송
GET  /v1/auth/sessions                   # 세션 목록
DELETE /v1/auth/sessions/:id             # 세션 삭제
GET  /v1/auth/oauth/connections          # OAuth 연결 목록
DELETE /v1/auth/oauth/connections/:provider # OAuth 연결 해제
```

### 사용자
```
GET    /v1/users/me                      # 본인 정보 조회
PATCH  /v1/users/me                      # 프로필 수정
PATCH  /v1/users/me/password             # 비밀번호 변경
DELETE /v1/users/me                      # 계정 탈퇴
POST   /v1/users/me/email                # 이메일 변경 요청
POST   /v1/users/me/email/confirm        # 이메일 변경 확인
```

### 게시판
```
GET    /v1/boards                        # 게시판 목록
GET    /v1/boards/:id/posts              # 게시글 목록 (categoryId 필터 지원)
POST   /v1/boards/:id/posts              # 게시글 생성 (파일 첨부 가능)
GET    /v1/boards/:id/posts/:postId      # 게시글 조회
PATCH  /v1/boards/:id/posts/:postId      # 게시글 수정
DELETE /v1/boards/:id/posts/:postId      # 게시글 삭제
POST   /v1/boards/:id/posts/:postId/reactions/:emojiId # 리액션 추가
```

### 알림
```
GET  /v1/notifications                   # 알림 목록
GET  /v1/notifications/unread-count      # 미읽음 수
GET  /v1/notifications/stream            # SSE 실시간 스트림
PATCH /v1/notifications/:id/read         # 개별 읽음 처리
PATCH /v1/notifications/read-all         # 전체 읽음 처리
GET  /v1/notifications/push-subscription/public-key # VAPID 공개키
POST /v1/notifications/push-subscription # 웹 푸시 구독 저장
DELETE /v1/notifications/push-subscription # 웹 푸시 구독 해제
```

### 검색
```
GET /v1/search?q=키워드&type=post|comment&boardId=...&authorId=...
```

### 신고
```
POST   /v1/reports                       # 신고 생성
GET    /v1/reports                       # 신고 목록 (관리자)
PATCH  /v1/reports/:id/action            # 신고 처리 (숨김·삭제·경고·정지)
PATCH  /v1/reports/:id/reject            # 신고 기각
```

### 업로드
```
POST /v1/upload                          # 파일 업로드
GET  /v1/upload/:id/file                 # 파일 서빙 (302 redirect)
GET  /v1/upload/:id/thumbnail            # 썸네일 서빙 (302 redirect)
```

---

## 🏗️ 아키텍처

### Repository 패턴
```
Controller → Service → Repository (*.query.ts | *.command.ts) → Prisma
```
읽기(Query)와 쓰기(Command)를 파일 레벨에서 분리합니다.

### 알림 아키텍처
```
EventEmitter2 (notification.created)
  → NotificationListener
    → DB 저장 (notifications 테이블)
    → InMemoryNotificationEmitter → SSE 발송
    → PushSubscriptionService → 웹 푸시 발송
```
`NOTIFICATION_EMITTER` 심볼 토큰으로 추상화되어 있어, Redis 기반 Emitter로 교체 시 `NotificationModule` provider만 변경하면 됩니다.

### 파일 업로드 아키텍처
```
STORAGE_DRIVER=local  → LocalStorageProvider  (uploads/ 디렉토리)
STORAGE_DRIVER=s3     → S3StorageProvider     (AWS S3 / MinIO)
```
환경변수 하나로 드라이버를 전환할 수 있습니다.

### 권한 시스템
역할(Role) 대신 **권한 그룹(PermissionGroup)** 기반으로 동작합니다.
- 사용자는 여러 권한 그룹에 속할 수 있습니다.
- `PERMISSIONS` 상수와 `hasPermission()` 함수가 `@weaver2/shared`에 정의되어 백엔드·프론트엔드가 공유합니다.
- 와일드카드 지원: `board:*`는 `board:read`, `board:write` 등을 모두 포함합니다.

---

## 🔐 보안

- **JWT**: HttpOnly 쿠키 기반, Access Token 15분 / Refresh Token 최대 30일
- **CSRF**: 뮤테이션 요청마다 `x-csrf-token` 헤더 검증
- **Rate Limiting**: 전역 60초/100회, 로그인 60초/10회, 2FA 60초/3~5회
- **계정 잠금**: 로그인 5회 실패 → 15분 잠금
- **보안 헤더**: Helmet, HSTS(프로덕션), X-Frame-Options 등

---

## 🛠️ 주요 명령어

```bash
# 개발 서버
pnpm dev              # 실행할 앱 선택 (대화형 메뉴)
pnpm dev:core         # 백엔드 개발 모드
pnpm dev:web          # 프론트엔드 개발 모드
pnpm build            # 백엔드 프로덕션 빌드

# 데이터베이스
pnpm db:generate      # Prisma 클라이언트 생성
pnpm db:migrate       # 마이그레이션 실행
pnpm db:seed          # 시드 데이터 생성
pnpm db:reset         # DB 초기화 + 시드

# 코드 품질
pnpm lint             # ESLint 검사
pnpm format           # Prettier 포맷팅
pnpm test             # 유닛 테스트
pnpm test:integration # 통합 테스트 (Postgres 필요)

# E2E (Playwright) — 풀 스택 시나리오, 자세한 안내는 apps/core-frontend/e2e/README.md
pnpm --filter core-frontend e2e:install    # 1회: chromium 브라우저 설치
pnpm --filter core-frontend e2e            # e2e 실행 (자동으로 frontend·backend 기동)
pnpm --filter core-frontend e2e:ui         # Playwright UI 모드 (시나리오 작성/디버깅)
```

---

## 🐳 Docker

```bash
# 개발 환경 (PostgreSQL + 앱)
docker-compose up -d

# 프로덕션
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🤖 CI / GitHub Actions

`.github/workflows/`에 4개의 워크플로우가 포함되어 있습니다.

| 워크플로우 | 트리거 | 역할 |
|----------|--------|------|
| `ci.yml` | PR / main push / 수동 | install → secret-files / lint / unit / integration / backend build / web build / prisma check → `CI success` 단일 게이트 |
| `security.yml` | 매주 월 09:00 KST / 수동 / 의존성 PR | `pnpm audit --audit-level=high`, 발견 시 자동 Issue 생성 + PR fail |
| `pr-checks.yml` | PR 이벤트 | Conventional Commits 제목 검사, 경로별 자동 라벨, 500줄 이상 PR 경고 |
| `codeql.yml` | PR / main push / 매주 월 14:00 KST / 수동 | GitHub CodeQL 정적 분석 (security-extended 쿼리) |

**설계 포인트**:
- `ci-success` 단일 aggregator job — Branch protection에서 이 하나만 require하면 충분.
- `HUSKY=0` + `--ignore-scripts` + 명시적 `prisma generate` — pnpm v11의 `approve-builds` 프롬프트와 husky postinstall 노이즈 회피.
- Postgres 16 service container + healthcheck로 integration test 격리.
- `concurrency.cancel-in-progress` — 동일 PR 새 push 시 진행 중 run 자동 취소.

### Branch ruleset 권장 설정

저장소 `Settings → Rules → Rulesets → New branch ruleset`:

- **Target**: default branch
- **Restrict deletions** ✅
- **Block force pushes** ✅
- **Require a pull request before merging** ✅
  - Required approvals: 1
  - Dismiss stale approvals: ✅
  - Require conversation resolution: ✅
- **Require status checks to pass** ✅
  - **`CI success`** 단일 등록 (워크플로우가 한 번 실행된 후에 검색 가능)
  - **`Analyze (javascript-typescript)`** 추가 (CodeQL — public 또는 Team/Enterprise plan)

### 외주/private 저장소로 복제 시

이 보일러플레이트를 private repo로 복제하셨다면 **plan에 따라 ruleset 일부 항목을 빼야** 합니다:

| 기능 | Public Free | Private Free | Private Team/Enterprise |
|------|------------|-------------|------------------------|
| Code Scanning (CodeQL) | ✅ | ❌ → ruleset에서 제거 | ✅ |
| `Restrict file paths` (Push ruleset) | ✅ | ❌ → 본 보일러플레이트의 3-layer guard 사용 | ✅ |
| Dependabot | ✅ | ✅ | ✅ |
| Branch ruleset | ✅ | ✅ | ✅ |

> Private + Free 환경에서 CodeQL 워크플로우 자체는 두어도 무방하지만 결과를 Security 탭에서 볼 수 없으며, ruleset의 `Require code scanning results`는 영원히 만족되지 않으므로 반드시 제거해야 합니다.

### Secret/key 파일 차단 — 3-layer guard

이 보일러플레이트는 GitHub plan 의존 없이 secret 유출을 방어합니다:

1. `.gitignore` — `.env*` (단, `.env.example` 제외), `*.pem/.key/.p12/.pfx/.crt/.cer`, `id_rsa*`, `id_ed25519*`
2. `.husky/pre-commit` — staged 파일 검사 후 차단 (커밋 자체가 실패)
3. `ci.yml`의 `secret-files` job — 트리 전체 검사 (push에서 차단)

세 단계가 동일 패턴을 공유하므로 어느 하나가 뚫려도 다음에서 잡힙니다.

---

## 📚 문서 구조

| 문서 | 역할 |
|------|------|
| [`README.md`](README.md) | 프로젝트 소개, 기술 스택, API, CI 가이드 (이 문서) |
| [`CHARTER.md`](CHARTER.md) | 보일러플레이트 헌장 — 미션, IN/OUT 범위, 설계 원칙, 확장 포인트, 분기 체크리스트 |
| [`docs/handbook/`](docs/handbook/) | **개발자 온보딩 핸드북** — 시스템 내부 동작 해설 (요청 수명주기, 인증·권한·알림·업로드 파이프라인, 데이터 모델, 프론트 구조, 새 기능 워크스루) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | 일상 개발 워크플로우, 브랜치/커밋/PR/리뷰/마이그레이션/테스트/FAQ |
| [`SECURITY.md`](SECURITY.md) | 보안 취약점 보고·대응 정책, 빌트인 보안 레이어 정리 |
| [`ROADMAP.md`](ROADMAP.md) | 향후 권장 작업 (Dependabot, e2e, 운영 등) |
| [`CLAUDE.md`](CLAUDE.md) | 코딩 철학·EDGE 방법론·금지 사항 (AI 협업 규칙 포함) |
| [`apps/core-frontend/CLAUDE.md`](apps/core-frontend/CLAUDE.md) | 프론트엔드 디렉토리 구조·스킨 시스템·import 규칙 |
| [`docs/audits/`](docs/audits/) | 종합 감사 보고서 archive |
