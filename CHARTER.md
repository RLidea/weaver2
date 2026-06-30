# Weaver2 — Boilerplate Charter

> 본 문서는 **weaver2 보일러플레이트의 정체성을 명문화한 헌장**이다.
> 다음 프로젝트 분기 시점에 *"이거 넣어야 하나?"* / *"이건 왜 이렇게 짰지?"* /
> *"어디까지 갈아끼우라고 만든 거지?"* 를 다시 묻지 않도록 하는 단일 진실 원천(single source of truth).
>
> 분량은 의도적으로 짧다. 자주 바뀌는 문서는 헌장이 아니다.

---

## 1. Mission

NestJS + Next.js 기반의 풀스택 커뮤니티 플랫폼 보일러플레이트.
인증·권한·게시판·알림·관리자 같은 **공통 기반을 매번 다시 짓지 않고**,
새 프로젝트가 비즈니스 로직에만 집중할 수 있도록 출발선을 깎아둔다.

## 2. Target User

- **본인 + 사내 개발팀** — 신규 프로젝트 분기의 출발점이자, 팀이 함께 만지는 공용 기반.
- **장기 방향 (북극성)** — 공개 OSS 보일러플레이트. 단 현 단계의 정체성은 아니며, 도달에 필요한 갭은 [`ROADMAP.md`](ROADMAP.md)의 "OSS 공개를 위한 준비"에 정리.
- **Non-target (현 단계)** — 외부 OSS 일반 배포, 외주 협력사 단독 사용.

> 무게중심: 외부 일반 가독성보다, **본인과 새로 합류한 동료가 6개월 뒤 헷갈리지 않는 것**이 우선.
> "본인용"이 아니라 "팀용"이 되었으므로 — 온보딩·코드 가독성은 더 이상 후순위가 아니다([`docs/onboarding/`](docs/onboarding/)).
> 그럼에도 YAGNI는 유지한다: 팀용이 됐다고 쓰지도 않을 일반화를 미리 넣지 않는다. 필요해질 때 추가한다.

---

## 3. IN-SCOPE — 이 보일러플레이트가 갖춘 것

### 인증 & 사용자
- JWT(HttpOnly Cookie) + Refresh Token + 계정 잠금(5회/15분) + 다중 세션 관리
- OAuth 3종 (Google·Kakao·Naver) — Passport 미사용, native 구현
- 2FA (TOTP + 이메일 OTP)
- 이메일 변경 인증 / 비밀번호 재설정 / OAuth 연결 관리

### 권한 시스템
- 권한 그룹(PermissionGroup) + 와일드카드 + ResourcePermission
- 6종 시드 그룹: SuperAdmin / Admin / Operator / Moderator / User / Suspended
- `libs/shared`의 `PERMISSIONS` 상수를 백·프론트 공유

### 게시판
- 4단계 대댓글, 리액션, 고정 게시글, 카테고리, 첨부, 키셋 페이지네이션, 풀텍스트 검색

### 알림
- SSE 실시간 + Web Push (VAPID)
- `NOTIFICATION_EMITTER` 심볼 토큰으로 추상화 (Redis 전환 가능)

### 신고/모더레이션
- 다형 신고 (Post/Comment/User/Media), 콘텐츠 숨김·삭제, 사용자 경고·정지

### 관리자 UI
- 대시보드, 사용자/콘텐츠/신고/이메일 템플릿/시스템 설정/약관 관리

### 인프라·보안
- CSRF (csrf-csrf double-submit), Helmet, Rate Limiting (전역 + 민감 엔드포인트별)
- 헬스체크 (`/health`, `/health/ready`, `/health/live`)
- Winston 구조화 로깅
- `STORAGE_DRIVER` env로 Local ↔ S3 전환
- Docker (dev + prod), GitHub Actions 4종, Branch ruleset, 3-layer secret guard

### 프론트
- Next.js 16 (App Router) + Tailwind, SkinProvider 기반 다크/스킨, Storybook, Service Worker 기반 Web Push

---

## 4. OUT-OF-SCOPE — 의도적으로 제외한 것

| 항목 | 이유 |
|------|------|
| 결제·구독·송금·금융 | 도메인 종속. 프로젝트별 도입. |
| 멀티테넌시 | 단일 테넌트 가정. 복잡도 폭증. |
| **i18n (다국어 라이브러리)** | **한국어 단일 가정**. 다국어 프로젝트는 본 보일러플레이트 분기 후 별도 변종(fork)으로 진행. |
| 본인인증 (PASS / CI/DI) | 한국 사업자등록 의존. 한국 프로젝트에서 추가. |
| 카카오 알림톡 | 한국 사업자등록 의존. `NOTIFICATION_EMITTER` 추상화로 분기 후 추가 용이. |
| BullMQ / Redis 캐싱 | 운영 단계 의존성. 도입 가이드는 ROADMAP. 현재는 PermissionService 인메모리 LRU만. |
| K8s manifest | 배포 환경별. 헬스체크 엔드포인트만 준비, manifest는 runbook으로 분리. |
| 모니터링 (Sentry/PostHog/OpenTelemetry) | 프로젝트별. ROADMAP defer. |
| Webhook 발신 / 초대 시스템 | 현재 미사용. 필요 시 그때 추가. |
| 수정 이력 / 태그 시스템 | 도메인 의존. 프로젝트별. |
| CAPTCHA / Turnstile | 운영 단계 결정. 필요 시 그때 추가. |

---

## 5. 설계 원칙 (왜)

| 원칙 | 이유 |
|------|------|
| **Passport 미사용** | 의존성·블랙박스 최소화. 직접 OAuth 구현으로 디버깅 가능. |
| **권한 그룹 + 와일드카드** | 역할(Role) 인플레이션 방지. AWS IAM 패턴. |
| **SSE + Web Push (WebSocket 미사용)** | 단방향 알림이면 SSE로 충분. WebSocket 인프라 회피. |
| **모노레포 + `libs/shared`** | 백·프론트가 `PERMISSIONS` 상수를 공유. 권한 정의가 한 곳. |
| **CQRS 파일 분리** (`*.query.ts` / `*.command.ts`) | 읽기/쓰기 책임을 파일 레벨에서 시각화. |
| **Soft-delete + 명시 hard-delete** | `ON DELETE CASCADE`는 hard DELETE에서만 동작 — soft-delete 시 명시적 hard-delete가 안전. |
| **`@Public` 명시 + 글로벌 가드** | secure-by-default. 보호가 기본, 노출이 명시. |
| **한국어 단일 / Asia/Seoul timezone 기본값** | 사내 팀(한국) 기준. 다국어 분기는 별도 변종(fork). |
| **시드는 자연키 lookup** | `user.seed.ts`만 자기 ID 하드코딩 (leetspeak 디버깅 자산), 다른 시드는 username/name/code 등 자연키로 참조. |

### 5.1 일반화의 기준 — 언제 추상화하고, 언제 참는가

목표는 크게 잡되("어떤 외주 플랫폼이라도 커버"), **과도한 일반화(over-engineering)**와 **적정 일반화**는 다음 4렌즈로 가른다. 야심찬 *비전*은 과도한 일반화가 아니다 — 과도해지는 건 *아직 만나지 않은 요구를 지금 코드로 선제 구현*할 때다.

1. **증거 기반인가, 상상 기반인가** (가장 중요) — *이미 겪은* 차이를 흡수하면 적정, *겪을지 모를* 차이를 상상하면 과도. 리트머스: **"이 유연성을 요구한 실제 사례가 있나, 아니면 '혹시 몰라서'인가?"**
2. **Rule of Three** — 같은 패턴이 *실제로 3번* 나타나기 전엔 추상화하지 않는다. (1번 구현 → 2번 중복이 보여도 참기 → 3번 추상화)
3. **되돌리는 비용** — 싸게 바꿀 수 있는 것(함수 시그니처·내부 구조)은 미루고, 비싸게 바뀌는 것(DB 스키마·공개 API 경계·핵심 데이터 모델)만 미리 신중히 설계한다.
4. **확장 지점(seam) vs 구현** — 갈아끼울 *자리*(인터페이스)는 넉넉히 열되, *쓰지 않는 구현*은 미리 만들지 않는다. (예: `STORAGE_DRIVER`·`NOTIFICATION_EMITTER` — 자리는 열고 구현은 현재 필요한 것만; §6 참조)

> **비전은 크게, 추상화는 사례가 끌어당길 때 따라간다(pull, not push).** 새 프로젝트마다 공통이면 `libs/`로 승격, 특수하면 분기(fork)에 남긴다. weaver2는 *미리 부풀린 만능 플랫폼*이 아니라, *거칠수록 공통이 자라는 살아있는 보일러플레이트*다.

---

## 6. 확장 포인트 (갈아끼우라고 만든 경계)

| 위치 / 토큰 | 의도 |
|------------|------|
| `STORAGE_DRIVER` env | `local` ↔ `s3` (S3/MinIO) 전환 |
| `NOTIFICATION_EMITTER` 심볼 토큰 | InMemory ↔ Redis emitter 교체 |
| `PERMISSION_CACHE_STRATEGY` env | `memory` ↔ `none` (추후 `redis` 추가 가능) |
| `apps/core-backend/prisma/seed/permission-group.seed.ts` | 프로젝트별 권한 그룹 추가/수정 |
| `libs/shared/src/index.ts`의 `PERMISSIONS` | 프로젝트별 권한 상수 확장 |
| `apps/core-frontend/src/skins/` | 신규 스킨(테마) 추가 |
| `apps/core-backend/src/infrastructure/email/templates/` | 이메일 템플릿 프로젝트별 교체 |

---

## 7. 정책 (Conventions)

### 7.1 시드 원칙

1. **자연키 멱등성** — 모든 시드는 `username` / `name` / `code` / `version` 같은 자연키로 멱등 체크.
2. **자기 ID 하드코딩은 `user.seed.ts` 한정** — leetspeak ID(예: `...op3r4t0r`, `...m0d3r4t0`)는 디버깅 자산 + 통합 테스트 픽스처용으로 유지.
3. **다른 시드는 자연키 lookup으로 ID 획득** — `prisma.user.findUnique({ where: { username: 'admin' } })` 패턴.
4. **시그니처 통일** — `export async function seedXxx(prisma: PrismaClient): Promise<void>`. 자체 `new PrismaClient()` 금지.

### 7.2 메시지 위치 (약한 권장)

- 사용자 노출 메시지는 **가능한 한** 도메인 상수 / 템플릿 파일에 모아둔다.
- ✅ 적용 완료: 이메일 템플릿 (`apps/core-backend/src/infrastructure/email/templates/`)
- 🔄 분기 시 갈아엎는 전제: 시드 텍스트 (게시판/카테고리/예시 글)
- 🟡 흩어진 채로 OK: 컨트롤러 에러 메시지, 프론트 UI 텍스트 — *다국어 분기 시점에 통째로 회수* 가정.

### 7.3 커밋·문서 규칙

- 커밋 메시지: 영어 + 한국어 번역 병기, AI 생성 표시 금지 (`CONTRIBUTING.md` 참조).
- `docs/` 는 git 추적 (단 `docs/local/` 만 제외 — 임시·로컬 작업 노트). 시점 보고서는 `docs/audits/<topic>-<YYYY-MM-DD>.md`.
- AI 협업 규칙은 `CLAUDE.md`가 단일 진실 원천.

---

## 8. 알려진 한계

- 단일 언어 (`ko`), 단일 테넌트
- DB 커넥션 풀링은 기본값 — 본격 운영 시 PgBouncer 도입. Prisma 자체 풀 한도는 `DATABASE_URL` 쿼리 파라미터로 즉시 조절 가능 (`?connection_limit=10&pool_timeout=20`). `.env.example` 주석 참고.
- 모니터링 미연동 — 프로젝트별 결정
- `console.*` 잔존은 모두 **의도된 사용** — 시드 CLI 로깅(`prisma/seed/*`), React error boundary(`apps/core-frontend/src/app/error.tsx`), 빌드 타임 환경변수 경고(`server-api.ts`). 백엔드 서비스 코드는 NestJS `Logger`로 통일.
- DB raw 쿼리에 테이블·컬럼 식별자 직접 박힘 — **의도된 trade-off**. Prisma 파라미터 바인딩은 식별자에 못 쓰므로 상수화하면 `${Prisma.raw(...)}` 보일러플레이트가 폭증. `@@map`/필드명 변경 빈도가 매우 낮으므로 박힌 채로 유지. 위치: `features/search/repositories/`, `features/board/services/reaction.service.ts`, `infrastructure/analytics/`.
- 결제·송금·금융 미포함
- e2e 커버리지 최소 — 현재 유닛 102 + 통합 1 + e2e 1(로그인 골든패스, Playwright). 시나리오 확장은 ROADMAP. 인프라(`apps/core-frontend/e2e/`, CI test-e2e job)는 갖춰져 있어 추가는 spec 파일 한 개씩 들어감.
- **`module-registry`는 현재 banner 1례로 검증된 PoC** — 정직하게 둘로 나눠 본다. ✅ *합리적 절반*: 매니페스트 타입 + 의존성 추출기(`extract-manifest`)는 4개 모듈(board/abuse-report/search/banner)에 실제 적용되는 도구. ❌ *과도한 절반*: `scripts/module`의 add/remove와 `registration.ts`(471줄)·`catalog/`는 **banner 전용 하드코딩**이다 — banner 외 `id`를 넣어도 banner 블록을 삽입하므로 두 번째 모듈은 코드 재작성 없이 불가. `registry`/`catalog`/`dashboard` 명명이 실체(banner 전용 스크립트, UI 대시보드 없음, `generate.ts`=24줄 JSON 프린터)보다 크다. **"범용 모듈 시스템"이 아니라 "모듈 제거 가능성"의 검증된 1례로 읽을 것** — §5.1 Rule of Three(사례 1)·증거 기반 렌즈에 걸리는 의도된 선투자. 범용화 결정은 *두 번째 모듈을 떼어낼 때*로 미룬다(ROADMAP "OSS 공개를 위한 준비" ④).

---

## 9. 분기 체크리스트 (새 프로젝트 시작 시)

1. [ ] `apps/core-backend/.env` 생성 (`.env.example` 복사 후 비밀값 채움)
2. [ ] `apps/core-frontend/.env.local` 생성
3. [ ] `prisma/seed/permission-group.seed.ts` — 프로젝트별 그룹 추가/수정
4. [ ] `prisma/seed/seed.ts:68-75` — 게시판 이름 수정 (Notice/Free/Q&A → 프로젝트 게시판)
5. [ ] `prisma/seed/post.seed.ts` — 시드 게시글·카테고리 텍스트 수정 또는 제거
6. [ ] `apps/core-backend/src/infrastructure/email/templates/` — 이메일 템플릿 텍스트 교체
7. [ ] `apps/core-frontend/src/app/layout.tsx` — `metadata.title`, `metadata.description` 수정
8. [ ] `apps/core-frontend/src/skins/` — 색·폰트 프로젝트 색깔에 맞게 정의
9. [ ] 한국 프로젝트라면: 알림톡 / 본인인증 모듈 별도 추가
10. [ ] 운영 분기라면: DB 풀링(PgBouncer), 모니터링(Sentry 등), K8s manifest, BullMQ 도입 검토
11. [ ] `package.json` `name` / `description` / `author` 갱신
12. [ ] `apps/core-frontend/src/app/layout.tsx` `metadata.title` / `metadata.description` 프로젝트별 교체 (현재 "Weaver" / "Weaver web application")
13. [ ] e2e 시나리오 (`apps/core-frontend/e2e/`) 검토 — `auth-login.spec.ts`는 시드 admin(`admin@weaver.com`)에 의존하므로 시드 변경 시 함께 갱신
14. [ ] VAPID 키 새로 발급 (`node -e "const wp=require('web-push'); console.log(wp.generateVAPIDKeys())"`) — 보일러플레이트의 키 재사용 금지
15. [ ] `README.md`·`CHARTER.md` 프로젝트별 갱신 (또는 별도 변종으로 fork)

---

## 10. 살아있는 문서

본 헌장은 *시점 기록*이 아니라 **현재의 합의**다.

- 결정이 바뀌면 → 본 문서 갱신
- 새로운 의도된 추상화 추가 시 → §6 확장 포인트 갱신
- 새로운 의도된 제외 결정 시 → §4 OUT-SCOPE 갱신
- 새 프로젝트 분기 시 빠진 항목 발견 → §9 체크리스트에 즉시 추가

문서 자체가 자주 바뀌어야 한다고 느껴지면, 그건 보일러플레이트가 *아직 정체성을 못 잡았다는 신호*다.

---

## 📚 관련 문서

| 문서 | 역할 |
|------|------|
| [`README.md`](README.md) | 기능 카탈로그·기술 스택·API·CI 가이드 |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | 개발 워크플로우·브랜치/커밋/PR/리뷰/마이그레이션·테스트 |
| [`SECURITY.md`](SECURITY.md) | 보안 취약점 보고·대응, 빌트인 보안 레이어 |
| [`ROADMAP.md`](ROADMAP.md) | 향후 권장 작업 (Dependabot·e2e·운영) |
| [`CLAUDE.md`](CLAUDE.md) | AI 협업 규칙·코딩 철학·EDGE 방법론 |
| [`docs/audits/`](docs/audits/) | 시점 감사 보고서 아카이브 |
