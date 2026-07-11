# Weaver2 보일러플레이트 헌장 점검 리포트

**일자**: 2026-05-09
**관점**: **본인용** (다음 프로젝트 분기 시 함께 볼 기준)
**선행 문서**: [`weaver2-audit-2026-05-09.md`](weaver2-audit-2026-05-09.md) — P0~P2 39커밋 처리 완료
**목적**: `CHARTER.md` 작성을 위한 사전 진단

---

## 📌 한 줄 결론

> weaver2는 보일러플레이트로서 **거의 깨끗한 뼈대**이지만, "정체성을 명문화한 헌장"이 없어 6개월 뒤 분기·확장 의사결정 기준을 잃을 위험이 있다. 코드 자체보다 **문서·메타데이터의 잔재와 outdated 표기**가 더 큰 혼란 요인이다.

---

## ⭐ 강점 (유지)

| 영역 | 발견 |
|------|------|
| 도메인 종속성 | **거의 0** — 코드/시드/UI/.env 깨끗, 실 서비스명 언급은 `docs/production-readiness.md` 2건뿐 |
| 보안·아키 | 5/9 audit의 P0~P2 39커밋 모두 처리. IDOR/CSRF/IDOR/12 CVE/csurf→csrf-csrf 전부 정리됨 |
| 권한 시스템 | RolesGuard 제거 완료, PermissionGroup 6종 시드 (SuperAdmin/Admin/Operator/Moderator/User/Suspended) |
| 의도된 확장 포인트 | `STORAGE_DRIVER`(local/s3) + `NOTIFICATION_EMITTER` 심볼 토큰 — 명시적 추상화 |
| CI/CD | `ci.yml`/`security.yml`/`pr-checks.yml`/`codeql.yml` 4종 + Branch ruleset + 3-layer secret guard |
| libs/ 분할 | common/email/pagination/prisma/shared/upload — 응집도 높음, `forwardRef` 0건 |
| 시드 일반화 | 게시판 `Free`/카테고리 `일반·질문·공유`/예시 글 `Next.js App Router` 등 개발 친화적 |

---

## ⚠️ 5축 점검 결과

### 1. 기획 vs 구현 정합성

| 항목 | 문서 주장 | 실제 | 결과 |
|------|---------|------|------|
| Docker | 없음 | Dockerfile + docker-compose 2종 | ✅ 완성 (문서 outdated) |
| Rate Limiting | 비활성 | 전역 + 민감 엔드포인트별 강화 적용 | ✅ 완성 (문서 outdated) |
| 테스트 커버리지 | 3개 / <5% | 102개 spec | ✅ 증가 (문서 outdated) |
| CI/CD | 없음 | 4종 워크플로우 활성 | ✅ 완성 (문서 outdated) |
| 시크릿 관리 | placeholder 잔존 우려 | `.env.example` 정리됨 | ✅ 완성 |
| 파일 업로드 강화 | multer만 | sharp + S3 + 검증 | ✅ 완성 |
| Permission Plan 3·4단계 | 미체크 | RolesGuard 제거 / BoardPermission 통합 / 시드 / Admin CRUD 모두 동작 | ✅ 실제 완성, 체크박스만 안 찍힘 |
| DB 커넥션 풀링 | 없음 | Prisma datasource pool 옵션 미설정 | ⚠️ **그대로 미해결** |
| 모니터링 | 없음 | Sentry/PostHog/OTel 없음 (ROADMAP defer) | ⚠️ **그대로 미해결** |
| K8s 매니페스트 | 헬스체크만 | 헬스체크 ✓, manifest 없음 | ⚠️ **그대로 미해결** |
| 구조화 로깅 | console 46개 | Winston 도입 + console.log 23개 잔존 | ⚠️ **부분 해결** |

> **요지**: `docs/production-readiness.md`는 **80%가 outdated**. 헤더에 `ARCHIVED` 표기 1줄로 즉시 해결 가능.

### 2. 범용성 — 도메인 종속성

- **코드/시드/UI/패키지 메타데이터**: 0건 (깨끗)
- **`docs/production-readiness.md` L4, L161**: 실 서비스 프로젝트 사례 언급 (영향도: 하 — 내부 문서)
- **`.env.example` 한국 특화 기본값**: `APP_LOCALE=ko-KR`, `APP_TIMEZONE=Asia/Seoul` — 의도된 결정인지 헌장에 명시 필요
- **`apps/core-frontend/src/app/layout.tsx` `lang="ko"`** 하드코딩 — i18n 미지원의 신호
- **시드 게시판 카테고리**: `'일반', '질문', '공유'` (적절), 예시 글에 "Next.js App Router" — 개발자 친화

> **요지**: 범용성은 **95점**. 손볼 곳은 사실상 docs 표기와 i18n 의도 명시뿐.

### 3. 빠진 표준 기능 (보일러플레이트 관점)

| 카테고리 | 구현됨 | 미구현 | 부분 |
|---------|--------|--------|------|
| 백엔드 | Winston, Helmet, CSRF, Rate Limit, 헬스체크(/health, /ready, /live), Swagger, Throttler | **Redis 캐싱**, **BullMQ 큐**, **Audit Trail**, **DB 풀링**, **점검 모드**, **피처 플래그**, **데이터 Export**, **Webhook 발신**, **초대 시스템**, **i18n** | PermissionService LRU(인메모리만) |
| 인증/보안 추가 | OAuth(3종), 2FA(TOTP+이메일), 계정잠금, 세션관리 | **CAPTCHA**, **본인인증(PASS)**, **카카오 알림톡** | — |
| 콘텐츠/UX | 4단계 대댓글, 리액션, 고정글, 카테고리, 첨부, Soft-delete | **수정 이력**, **태그 시스템**, **자동 임시저장 로직** | Draft (모델만) |
| 프론트 | Storybook, 다크모드(SkinProvider), Web Push SW, ApiClient/queryKey 중앙화 | **프론트 테스트(RTL/Vitest)**, **sitemap.ts/robots.ts** | PWA(SW만, manifest 미확인) |

> **요지**: ROADMAP에 적힌 권장 작업과 거의 일치. 다만 **"의도적 제외"인지 "그냥 안 만든 것"인지** 구분이 없음 — 헌장이 해결할 부분.

### 4. 운영·배포 준비도

| 항목 | 상태 |
|------|------|
| Docker (dev + prod) | ✅ |
| CI/CD 4종 + ruleset | ✅ |
| 헬스체크 K8s-ready | ✅ (엔드포인트만, manifest 없음) |
| 시크릿 3-layer guard (.gitignore + husky + ci.yml) | ✅ |
| Web Push graceful disable (VAPID 미설정 시) | ✅ — 최근 커밋 24fb37e |
| 환경변수 — `PORT=3000` | ⚠️ 백엔드 기본은 4000 (README와 어긋남) |
| 환경변수 — `OAUTH_SUCCESS_REDIRECT_URL=http://localhost:5173` | ⚠️ vite 포트, 현재 프론트는 3000 |
| 환경변수 — DB 기본값 (`weaver/weaver1234`) | ⚠️ docker-compose용 — 헌장에 의도 명시 필요 |
| K8s manifest, 모니터링, DB 풀링 | ❌ — 의도적 OUT-SCOPE인지 헌장에서 정리 |

### 5. 문서·신뢰 신호

| 분류 | 위치 | 문제 | 권장 조치 |
|------|------|------|----------|
| 상호 모순 | README "Rate Limiting 적용" vs production-readiness "비활성" | production-readiness가 outdated | production-readiness 헤더에 `ARCHIVED` |
| Outdated | `docs/permission-plan.md` 체크박스 미체크 5개 | 실제 모두 완료됨 | 헤더에 `✅ 완료 (2026-05-09)` |
| 잔재 파일 | `CLAUDE.md.backup`, `.temp/`, `dist/`, `GEMINI.md` | 6개월 뒤 "어떤 게 진본?" 혼동 | 삭제 또는 통합 |
| frontend metadata | `title: "Weaver"`, `description: "Weaver web application"` | 신규 프로젝트 분기 시 변경 안내 없음 | CHARTER에 "분기 체크리스트"로 흡수 |
| 시드 하드코딩 | `post.seed.ts:4` `ADMIN_USER_ID = 'cmbyuak4e00001rjcld47s4u9'` | user.seed와 동기화 깨지면 throw | 동적 lookup으로 변경 |
| 응답 코드 표준 | 에러코드 표준 문서 없음 (ROADMAP만 언급) | API 클라이언트 작성 시 매번 추적 | 향후 별도 문서 |

---

## 🎯 본인용 — 6개월 뒤 막힐 Top 5

1. **`production-readiness.md`가 80% outdated** → 다음 분기 시 "아직 안 했나?" 착각. 1줄 헤더로 즉시 해결.
2. **헌장 부재로 "이거 넣어야 하나" 반복** → CHARTER.md 작성 (Phase 2의 본 작업).
3. **잔재 파일** (`CLAUDE.md.backup`, `.temp/`, `GEMINI.md`) → 청소.
4. **`.env.example` 잘못된 기본값** (`PORT=3000`, `OAUTH_*=:5173`) → 새 프로젝트에서 그대로 복사하면 막힘.
5. **`post.seed.ts` 하드코딩 `ADMIN_USER_ID`** → user.seed와 따로 노는 cuid는 깨지기 쉬움.

---

## 📝 CHARTER.md 입력 후보 (Phase 2 재료)

### 1) 정체성

- **Mission**: NestJS(v11) + Next.js(v16) 풀스택 커뮤니티 플랫폼 보일러플레이트
- **Target user**: **본인 / 팀원** — 신규 프로젝트 분기 시 인증·게시판·알림·관리자를 매번 다시 짜지 않기 위함
- **Non-target**: 외부 OSS 배포 / 외주 협업자 단독 사용

### 2) IN-SCOPE (유지하는 핵심)

인증(JWT 쿠키 + OAuth 3종 + 2FA + 계정잠금 + 세션관리) · 권한그룹(RBAC + 와일드카드 + ResourcePermission) · 게시판(4단계 대댓글 + 리액션 + 고정 + 카테고리 + 첨부) · 알림(SSE + Web Push) · 검색(GIN + keyset) · 업로드(local/s3 전환) · 신고·모더레이션 · 관리자 UI · CSRF·Rate Limit·Helmet · 헬스체크 · Winston · Storybook · 다크모드(SkinProvider)

### 3) OUT-OF-SCOPE (의도적 제외)

| 항목 | 이유 |
|------|------|
| 결제·구독 | 도메인 종속, 프로젝트별 도입 |
| 멀티테넌시 | 복잡도 폭증, 단일 테넌트 가정 |
| i18n | 한국어 단일 가정 (`lang="ko"` 하드코딩) — 필요 시 프로젝트별 |
| 본인인증 (PASS / CI/DI) | 한국 특화 의존성, 프로젝트별 |
| 카카오 알림톡 | 한국 특화 의존성, 프로젝트별 |
| BullMQ / Redis 캐싱 | 운영 단계 의존성 — 도입 가이드만 ROADMAP |
| K8s manifest | 배포 환경별 — runbook으로 분리 |
| 모니터링 (Sentry/PostHog/OTel) | 프로젝트별 — ROADMAP defer |
| Webhook 발신 / 초대 시스템 | 현재 미사용 |
| 수정 이력 / 태그 시스템 | 도메인 의존 — 프로젝트별 |

### 4) 설계 원칙 (왜)

- **Passport 미사용** → 의존성 최소화, 블랙박스 회피
- **권한 그룹 + 와일드카드** → 역할 inflation 방지, AWS IAM 패턴
- **SSE + Web Push** → WebSocket 인프라 회피
- **모노레포 + `libs/shared`** → 백·프론트 PERMISSIONS 상수 공유
- **CQRS 파일 분리** (`*.query.ts` / `*.command.ts`) → 읽기/쓰기 책임 시각화
- **Soft-delete + 명시 hard-delete** → `ON DELETE CASCADE` 함정 회피
- **`@Public()` 명시 + 글로벌 가드** → secure-by-default

### 5) 확장 포인트 (갈아끼우라고 만든 경계)

| 토큰/위치 | 의도 |
|----------|------|
| `STORAGE_DRIVER` env | local ↔ s3/MinIO |
| `NOTIFICATION_EMITTER` 심볼 | InMemory ↔ Redis emitter |
| `PERMISSION_CACHE_STRATEGY` env | memory ↔ none(추후 redis) |
| `permission-group.seed.ts` | 프로젝트별 그룹 추가 |
| `libs/shared/src/index.ts` `PERMISSIONS` | 프로젝트별 확장 |
| `apps/core-frontend/src/skins/` | SkinProvider 신규 스킨 |

### 6) 알려진 한계 (헌장에 박아둘 것)

- 단일 언어 (`ko`)
- 단일 테넌트
- DB 커넥션 풀링 미설정 (운영 시 PgBouncer)
- 모니터링 미연동
- 결제·송금·금융 미포함
- Reaction 메모리 압박 가능 (4단계 nested 평면화는 적용됨)
- console.log 23개 잔존 (Winston 전환 미완)

---

## 🧹 Phase 2 진입 전 1차 정리 권장 (소작업)

| # | 작업 | 파일 | 분량 |
|---|------|------|------|
| 1 | `production-readiness.md` 헤더에 `ARCHIVED` 표기 | `docs/production-readiness.md` | 5줄 |
| 2 | `permission-plan.md` 헤더에 `✅ 완료 (2026-05-09)` 표기 | `docs/permission-plan.md` | 3줄 |
| 3 | `CLAUDE.md.backup` 삭제 | 루트 | 1파일 |
| 4 | `.temp/` 삭제 | 루트 | 1디렉토리 |
| 5 | `GEMINI.md` 처리 (CONTRIBUTING.md로 통합 또는 삭제) | 루트 | 판단 필요 |
| 6 | `.env.example` `PORT=3000` → `4000` (백엔드용) | `apps/core-backend/.env.example` | 1줄 |
| 7 | `.env.example` `OAUTH_SUCCESS_REDIRECT_URL` `:5173` → `:3000` | 동상 | 2줄 |
| 8 | `post.seed.ts` `ADMIN_USER_ID` 하드코딩 → 동적 lookup | `apps/core-backend/prisma/seed/post.seed.ts` | 5줄 |

> 8개 모두 합쳐도 1커밋이면 충분. CHARTER 작성 전 정리하면 헌장이 더 깔끔해진다.

---

## 📋 Phase 2 진행 가이드

1. 본 리포트의 **CHARTER 입력 후보 6섹션**을 그대로 골격으로 사용
2. `CHARTER.md` 루트에 작성 (README와 동격)
3. 분량 1~2장, IN/OUT 표가 본체
4. 작성 후 README/ROADMAP에서 CHARTER로 링크 추가
5. 본 리포트는 헌장 작성의 근거 자료로 `docs/audits/`에 보존

---

**이 리포트의 한 문장 요약**:
*weaver2는 코드는 깨끗하지만 문서가 코드를 못 따라가고 있다. CHARTER는 그 격차를 메우는 한 장의 지도가 되어야 한다.*

---

## 📋 처리 매핑 (2026-05-09 본 세션 후속)

본 보고서가 발견한 모든 항목과 그 처리 커밋의 매핑입니다.
미래의 본인이 본 보고서를 다시 봤을 때 *"여기 적힌 건 모두 회수됐고, 다음 단계는 무엇인가"* 를 즉시 파악할 수 있도록 남겨둡니다.

### 본인용 6개월 뒤 막힐 Top 5 — ✅ 모두 완료

| # | 항목 | 처리 커밋 |
|---|------|----------|
| 1 | `production-readiness.md` 80% outdated | `5f66cd3` (audits/로 timestamped 아카이브) |
| 2 | 헌장 부재 | `9b555b3` (`CHARTER.md` 신설) |
| 3 | 잔재 파일 (`CLAUDE.md.backup`, `.temp/`, `GEMINI.md`) | `42ea69d` |
| 4 | `.env.example` 어긋난 포트 (`PORT=3000`, `OAUTH_*=:5173`) | `f6d8224` |
| 5 | `post.seed.ts`의 하드코딩 `ADMIN_USER_ID` | `c070ed7` |

### Phase 2 진입 전 1차 정리 권장 8개 — ✅ 모두 완료

| # | 항목 | 처리 커밋 |
|---|------|----------|
| 1·2 | `production-readiness.md` / `permission-plan.md` ARCHIVED 표기 + audits 이동 | `5f66cd3` |
| 3·4·5 | `CLAUDE.md.backup` / `.temp/` / `GEMINI.md` 정리 | `42ea69d` |
| 6·7 | `.env.example` `PORT` / `OAUTH_*` 정정 | `f6d8224` |
| 8 | `post.seed.ts` `ADMIN_USER_ID` 하드코딩 정리 | `c070ed7` |

### CHARTER.md 입력 후보 6섹션 — ✅ 모두 흡수

`9b555b3` (CHARTER.md 신설) — 미션·타깃·IN/OUT·설계 원칙·확장 포인트·시드 원칙·메시지 위치·알려진 한계·분기 체크리스트 모두 반영.

### 알려진 한계 후속 처리 (Plan A) — ✅ 완료

| 항목 | 처리 커밋 |
|------|----------|
| `admin-security.api.service.ts` 22 `console.*` → NestJS Logger | `1c6b9b8` |
| raw 쿼리 식별자 박힘 = 의도된 trade-off로 명문화 + Prisma 풀링 힌트 | `5f42db2` |

### e2e 도입 (Plan B) — ✅ 인프라 + 첫 시나리오 완료

| 항목 | 처리 커밋 |
|------|----------|
| Playwright 베이스라인 (config·디렉토리·스크립트·gitignore) | `726eca1` |
| 첫 시나리오 (로그인 골든패스, admin 시드) | `5102364` |
| CI `test-e2e` job + CI-aware webServer | `b56bf03` |
| README/CONTRIBUTING/CHARTER §8/ROADMAP 안내 | `def1714` |

시나리오 확장(Plan B-4)은 별도 세션으로 이관 — 페르소나 메모리에 보관.

### 보너스 (본 리포트 외 처리)

| 항목 | 처리 커밋 |
|------|----------|
| 개인 이름 표현 중립화 (audit / charter-review) | `404faad` |
| README/ROADMAP에 `CHARTER.md` 링크 | `b0160af` |

---

> **상태**: 본 보고서가 발견한 모든 항목 처리 완료. 다음 audit이 작성되기 전까지 본 문서는 *시점 기록*으로 보존된다.
