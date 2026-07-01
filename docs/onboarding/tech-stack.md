# 기술 스택 & 학습 로드맵

> **"weaver"는 *엮다(weave)*에서 왔습니다.** weaver2는 커뮤니티 서비스에 필요한 여러 프레임워크·라이브러리를 **미리 골라 엮어 세팅해 둔** 출발선입니다. 이 문서는 *무엇을 엮어 놨는지*(인벤토리)와 *무엇을 어떤 순서로 배우면 되는지*(로드맵)를 한곳에 모읍니다.

## 어떻게 보나

- **우선순위** — 🔴 반드시(이걸 모르면 코드가 안 읽힘) / 🟡 권장(자주 만남) / ⚪ 필요할 때(해당 기능 건드릴 때만)
- 순수 문법은 **공식 문서가 최고의 교재**입니다. 이 가이드의 각 장은 "weaver2가 *어떻게* 쓰는지"를, 공식 문서는 "그것 *자체*"를 담당합니다. 둘을 함께 보세요.

---

## 🔴 핵심 기반 — 먼저 이것부터

이 다섯은 weaver2의 뼈대입니다. 여기가 흔들리면 어느 장을 봐도 헤맵니다.

| 기술 | 역할 | weaver2에서 | 공식 문서 |
|------|------|------------|----------|
| **TypeScript** | 전 계층 언어 | 백·프론트 전부 | [typescriptlang.org/docs](https://www.typescriptlang.org/docs/) |
| **NestJS** | 백엔드 프레임워크(모듈·DI·데코레이터) | [3장](03-backend-fundamentals.md) | [docs.nestjs.com](https://docs.nestjs.com/) |
| **Next.js 16 + React 19** | 프론트(App Router) | [6장](06-frontend.md) | [nextjs.org/docs](https://nextjs.org/docs) · [react.dev](https://react.dev/) |
| **Prisma** | ORM(스키마·마이그레이션·타입) | [4장](04-data-layer.md) | [prisma.io/docs](https://www.prisma.io/docs) |
| **PostgreSQL** | 데이터베이스 | [4장](04-data-layer.md) | [postgresql.org/docs](https://www.postgresql.org/docs/) |

> 💡 도구 자체: **Node.js ≥22** · **pnpm 11**([pnpm.io](https://pnpm.io/)) · **Docker**([docs.docker.com](https://docs.docker.com/)) — [2장 시작하기](02-getting-started.md)에서 다룹니다.

---

## 🟡 백엔드 주요 — NestJS 위에 얹힌 것들

| 기술 | 역할 | weaver2에서 | 공식 문서 |
|------|------|------------|----------|
| **class-validator / class-transformer** | DTO 검증·변환 | [3장](03-backend-fundamentals.md) | [github.com/typestack/class-validator](https://github.com/typestack/class-validator) |
| **RxJS** | 인터셉터 등 리액티브 스트림 | 3장(SuccessInterceptor 등) | [rxjs.dev](https://rxjs.dev/) |
| **@nestjs/jwt + passport-jwt/local** | 로그인 인증 | [5장](05-auth-and-permissions.md) | [docs.nestjs.com/security/authentication](https://docs.nestjs.com/security/authentication) |
| **@nestjs/event-emitter** | 이벤트 기반 알림 | 5장·알림 아키텍처 | [docs.nestjs.com/techniques/events](https://docs.nestjs.com/techniques/events) |
| **@nestjs/swagger** | OpenAPI 자동 문서(`/docs`) | 2장·3장 | [docs.nestjs.com/openapi](https://docs.nestjs.com/openapi/introduction) |
| **@nestjs/throttler** | Rate limiting | 5장·보안 | [docs.nestjs.com/security/rate-limiting](https://docs.nestjs.com/security/rate-limiting) |

---

## 🟡 프론트엔드 주요

| 기술 | 역할 | weaver2에서 | 공식 문서 |
|------|------|------------|----------|
| **TanStack Query** (React Query) | 서버 상태·캐싱 | [6장](06-frontend.md) (hooks 계층) | [tanstack.com/query](https://tanstack.com/query/latest) |
| **React Hook Form + Zod** | 폼 상태 + 스키마 검증 | 6장 (features/*/components) | [react-hook-form.com](https://react-hook-form.com/) · [zod.dev](https://zod.dev/) |
| **Tailwind CSS v4** (+ clsx, tailwind-merge) | 스타일링(스킨 토큰 위임) | 6장 (스킨 시스템) | [tailwindcss.com/docs](https://tailwindcss.com/docs) |

---

## ⚪ 필요할 때 — 특정 기능을 건드릴 때만

| 기술 | 역할 | weaver2에서 | 공식 문서 |
|------|------|------------|----------|
| **bcrypt** | 비밀번호 해싱 | 5장(인증) | [github.com/kelektiv/node.bcrypt.js](https://github.com/kelektiv/node.bcrypt.js) |
| **otplib + qrcode** | 2FA(TOTP·QR) | 5장 | [github.com/yeojz/otplib](https://github.com/yeojz/otplib) |
| **sharp** | 이미지 리사이징·썸네일 | [7장](07-libs.md) (upload) | [sharp.pixelplumbing.com](https://sharp.pixelplumbing.com/) |
| **nodemailer** | 이메일 발송(SMTP) | 7장 (email) | [nodemailer.com](https://nodemailer.com/) |
| **web-push** | 웹 푸시(VAPID) | 알림 | [github.com/web-push-libs/web-push](https://github.com/web-push-libs/web-push) |
| **multer** | 파일 업로드 | 7장 (upload) | [github.com/expressjs/multer](https://github.com/expressjs/multer) |
| **helmet · csrf-csrf** | 보안 헤더·CSRF | 5장·보안 | [helmetjs.github.io](https://helmetjs.github.io/) · [csrf-csrf](https://github.com/Psifi-Solutions/csrf-csrf) |
| **winston** (+ nest-winston) | 구조화 로깅 | 백엔드 전역 | [github.com/winstonjs/winston](https://github.com/winstonjs/winston) |
| **@aws-sdk/client-s3** | S3 스토리지 드라이버 | 7장 (`STORAGE_DRIVER=s3`) | [AWS SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/) |
| **recharts** | 관리자 대시보드 차트 | 6장(admin) | [recharts.org](https://recharts.org/) |
| **@xyflow/react** (React Flow) | 노드 기반 다이어그램 UI | 6장(해당 화면) | [reactflow.dev](https://reactflow.dev/) |

---

## 🛠️ 개발 도구 — 코드를 짜고 검증하는 도구

| 도구 | 역할 | 공식 문서 |
|------|------|----------|
| **Jest** | 단위·통합 테스트(`*.spec.ts`) | [jestjs.io](https://jestjs.io/) |
| **Playwright** | E2E 테스트 | [playwright.dev](https://playwright.dev/) |
| **ESLint · Prettier** | 린트·포매팅 | [eslint.org](https://eslint.org/) · [prettier.io](https://prettier.io/) |
| **Husky** | git pre-commit 훅 | [typicode.github.io/husky](https://typicode.github.io/husky/) |
| **Storybook** | 컴포넌트 문서·개발 | [storybook.js.org](https://storybook.js.org/) |
| **ts-morph** | TypeScript AST 조작(module-registry가 사용) | [ts-morph.com](https://ts-morph.com/) |
| **tsx** | TS 스크립트 즉시 실행 | [github.com/privatenumber/tsx](https://github.com/privatenumber/tsx) |

> 🔍 테스트·모듈 스크립트 실제 명령은 [10장 참고](10-reference.md#-명령어-모음)에 정리돼 있습니다.

---

## 📚 학습 로드맵 — 무엇을 어떤 순서로

"전부 한 번에"는 불가능합니다. **🔴 → 🟡 → ⚪** 순서로, 실제 코드를 만지며 필요한 것부터 익히세요.

**1주차 — 뼈대 세우기 (🔴)**
1. TypeScript 기초가 없다면 먼저 (하루 정도 훑기)
2. [2장 시작하기](02-getting-started.md)로 프로젝트를 **직접 띄워보기** (가장 빠른 감 잡기)
3. NestJS *First steps + Controllers/Providers/Modules*, Next.js *App Router 기초*, Prisma *스키마·쿼리 기초* — 공식 튜토리얼 각 1회독
4. [1장 소개](01-introduction.md)·[3장 백엔드](03-backend-fundamentals.md)·[4장 데이터](04-data-layer.md)를 읽으며 weaver2가 그걸 어떻게 쓰는지 대조

**2주차 — 일상 개발 (🟡)**
1. [5장 인증·권한](05-auth-and-permissions.md) — class-validator, Passport/JWT, 권한 가드
2. [6장 프론트](06-frontend.md) — TanStack Query, React Hook Form+Zod, Tailwind
3. [7장 libs](07-libs.md) — 공유 패키지 경계
4. [9장 실전 가이드](09-recipes.md)로 **작은 기능 하나를 처음부터 끝까지** 추가해보기

**3주차+ — 깊이와 본체 (⚪ + 심화)**
1. [8장 모듈 레지스트리](08-module-registry.md) — 이 프로젝트만의 개념(ts-morph, 매니페스트)
2. ⚪ 항목들은 해당 기능(2FA·업로드·푸시·차트 등)을 실제로 건드릴 때 그때그때

> 📌 **핵심 원칙**: 문서를 통독하고 "다 안다"가 아니라, **띄우고 → 만지고 → 막히면 그 부분 공식 문서**로 가는 게 가장 빠릅니다. weaver2는 이미 다 엮여 돌아가는 상태니까요.

---

→ [처음으로 — 온보딩 목차](README.md)
