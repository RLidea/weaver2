# 08. 프론트엔드 아키텍처

> Next.js 앱이 어떻게 조직되어 있는지 — 라우팅 지도, 도메인 슬라이스, ApiClient의 자동 처리(CSRF·refresh), 스킨 시스템, 데이터 페칭 규칙.
> 코드 위치: `apps/core-frontend/` · 스택: Next.js 16 (App Router) + React 19 + TanStack Query 5 + Tailwind CSS 4

## 1. 라우팅 지도 — route group 4개

`src/app/`은 **라우팅 전용**입니다. 페이지 파일은 얇은 진입점이고 실제 화면은 슬라이스 컴포넌트를 import합니다 (페이지에 비즈니스 로직 금지 — `apps/core-frontend/CLAUDE.md`).

| 그룹 | 성격 | 라우트 |
|---|---|---|
| `(auth)` | 비인증 전용 (세션 있으면 `/dashboard`로) | `/login`, `/sign-up`, `/forgot-password` |
| `(public)` | 누구나 | `/`(랜딩), `/reset-password` |
| `(protected)` | 인증 필수 | `/dashboard`, `/boards`, `/boards/[id]`, `/boards/[id]/write`, `/boards/[id]/posts/[postId]`, `/notifications`, `/search`, `/users/[username]`, `/settings/{profile,security,notifications}` |
| `(admin)` | `ADMIN.ACCESS` 권한 필수 | `/admin` + `/admin/{users,boards,content,permissions,reports,terms,email-templates,settings}` |

그룹 밖 예외: `/auth/verify` (이메일 인증 링크 착지).

## 2. 디렉토리 아키텍처 — 도메인 슬라이스 2계층

```
src/
├── app/             # 라우팅 껍데기만
├── core/            # 플랫폼 핵심 슬라이스 — auth, user, notification, dashboard, terms
├── features/        # 업무 기능 슬라이스 — board, search, admin/*
├── shared/          # 도메인 무관 공통 — components/ui, components/layout, hooks
├── infrastructure/  # api-client.ts, server-api.ts, query-client.ts, providers/
├── skins/           # 스킨(테마) CSS 변수
├── types/           # 전역 타입
└── proxy.ts         # 엣지 미들웨어 (Next.js 16: middleware.ts의 새 이름)
```

백엔드의 core(substrate)/features(도메인) 구분이 프론트에도 그대로 적용됩니다. 모든 슬라이스는 표준 구조를 따릅니다:

```
{domain}/
├── api/{domain}.api.ts   # apiClient 호출 함수 객체 (Repository 역할)
├── hooks/use-*.ts        # useQuery/useMutation 래핑 (Service 역할)
├── components/           # 도메인 전용 UI
├── query-keys.ts         # React Query 키 팩토리
└── types.ts
```

import 별칭: `@/infrastructure`, `@/shared`, `@/core/{d}`, `@/features/{d}`, `@/skins`, `@/types`. 모노레포 공유 패키지 `@weaver2/shared`(권한 상수·`hasPermission`)는 `next.config.ts`의 `transpilePackages`로 포함됩니다.

## 3. ApiClient

**모든 HTTP는 `apiClient` 싱글톤으로** — `fetch()` 직접 사용 금지 (프로젝트 CRITICAL 규칙). `src/infrastructure/api-client.ts`가 자동 처리하는 것들:

| 자동 처리 | 동작 |
|---|---|
| 베이스 URL | `NEXT_PUBLIC_API_URL=/api` — same-origin. Next `rewrites`가 `/api/*` → 백엔드(`API_URL`)로 프록시 (쿠키가 자연스럽게 동행) |
| 쿠키 | 전 요청 `credentials: 'include'` |
| CSRF | 뮤테이션에만 `x-csrf-token` 자동 주입. `GET /v1/auth/csrf-token`으로 발급→캐시, 403이면 재발급 후 1회 재시도 |
| 401 refresh | 최초 401이면 `POST /v1/auth/refresh` 후 원요청 1회 재시도. **동시다발 401은 `refreshQueue`로 refresh 1회에 수렴**. 최종 실패 시 `onAuthError`(→ `/login` 이동) |
| 에러 | 백엔드 표준 에러를 `ApiError`로 파싱 (`isUnauthorized`, `isValidationError` 등 판별 프로퍼티) |
| 응답 | `{ message, data }` 표준을 `ApiResponse<T>` 타입 그대로 반환 (**언래핑은 호출부 책임** — 훅에서 `res.data` 접근), 204는 `data: undefined` |

메서드: `get/post/put/patch/delete/deleteWithBody/postForm`(FormData). 로그인 화면처럼 401을 직접 다루고 싶으면 `RequestOptions.skipOnAuthError`.

**서버 컴포넌트에서는** `serverFetch`(`server-api.ts`)를 씁니다 — 백엔드에 직접 붙고(`API_URL`), `next/headers`의 쿠키를 전달하며, CSRF/refresh 로직이 없습니다. 현재 실사용은 랜딩 페이지 1곳 — 이 앱의 무게중심은 클라이언트 + React Query입니다.

## 4. 인증 상태 — 3중 방어

1. **엣지 미들웨어** `src/proxy.ts` — Next.js 16에서 `middleware.ts`가 `proxy.ts`로 바뀌었습니다. 쿠키(`access_token`/`refresh_token`) 존재로 세션을 판정해, 보호 경로 무세션 접근은 `/login?redirect=`로, 로그인 상태의 `/login` 접근은 `/dashboard`로 보냅니다
2. **레이아웃 가드** — `(protected)/layout.tsx`가 `useMe()`로 재확인, `(admin)/layout.tsx`는 추가로 `hasPermission(user.permissions, PERMISSIONS.ADMIN.ACCESS)` 검사
3. **화면·액션 단위** — `<RequirePermission>` 컴포넌트 / `hasPermission()` 직접 호출 → [04장 §7](04-permissions.md#7-프론트엔드에서의-권한)

**로그인 상태의 단일 진실원은 `useMe()`** (`core/user/hooks/use-me.ts`, React Query 5분 캐시)입니다. 별도 auth Context는 없습니다 — `AuthProvider`는 ApiClient에 `onAuthError` 콜백만 주입하는 얇은 레이어입니다.

## 5. 스킨 시스템

- 스킨 = CSS 변수 세트. `skins/{default,dark}.css`가 `[data-skin="..."]` 셀렉터로 토큰 값을 정의합니다. **다크모드는 별도 개념이 아니라 "dark 스킨"**입니다
- 전환: `SkinProvider`의 `setSkin` — `localStorage['skin']` 저장 + `<html data-skin>` 변경. FOUC 방지를 위해 루트 layout의 인라인 스크립트가 JS 로드 전에 적용합니다
- **컴포넌트는 semantic 토큰만** 사용합니다: `bg-surface`, `text-text`, `border-border`, `text-primary` … (하드코딩 `bg-white` 금지). 타이포는 `text-*`/`font-*` 클래스가 스킨 토큰으로 위임되고, `<Typography variant>` 컴포넌트도 있습니다
- 새 스킨 추가: `skins/{name}.css` 생성 + `skins/index.ts`의 `SkinId`/`SKINS`에 등록. 토큰 카탈로그는 Storybook(`stories/tokens/`)에서 시각 확인

토큰 전체 목록과 사용 규칙: [`apps/core-frontend/CLAUDE.md`](../../apps/core-frontend/CLAUDE.md), [`.agents/skills/weaver-ui-patterns/`](../../.agents/skills/weaver-ui-patterns/)

## 6. 데이터 페칭 규칙

- **TanStack Query v5가 주력.** 슬라이스마다 `api/*.api.ts`(순수 호출) → `hooks/use-*.ts`(useQuery/useMutation) 2계층, 키는 `query-keys.ts` 팩토리로 관리
- QueryClient 기본값 (`infrastructure/query-client.ts`): staleTime 1분, 401/403은 retry 제외, mutation retry 없음
- **mutation 에러는 전역 토스트가 기본** — `MutationCache.onError`가 처리하므로 개별 `onError`를 안 써도 사용자에게 에러가 보입니다. 끄려면 `meta.skipGlobalErrorToast`
- 실시간: SSE 훅(`use-notification-stream.ts`)이 수신 이벤트로 React Query 캐시를 직접 조작합니다 → [05장 §3](05-notifications.md#3-sse--실시간-전달)

**API 타입은 백엔드 OpenAPI에서 생성** — 응답/요청 타입은 손으로 미러링하지 않고 `src/types/api-schema.d.ts`(백엔드 스펙에서 생성)의 `components['schemas']`에서 파생합니다. 백엔드 DTO가 진실의 원천이고, 바꾼 뒤 `pnpm openapi:types`로 재생성하면 불일치가 **컴파일 에러**로 드러납니다(CI가 drift 검사). 파이프라인: 백엔드 DTO(`@ApiProperty`, 플러그인이 TS 타입 자동 추론) → `openapi.json`(preview 모드 추출) → `api-schema.d.ts`. union 리터럴·쿼리 파라미터·응답 봉투·계산 헬퍼처럼 스펙에서 파생 불가한 것만 손 정의로 남깁니다. 시범 적용: [`features/admin/users/types.ts`](../../apps/core-frontend/src/features/admin/users/types.ts). 전면 교체가 아니라 신규 도메인·시범 도메인부터 점진 적용합니다.

**URL 상태 관리** — 검색·필터·정렬·페이지 조건은 컴포넌트 state가 아니라 URL 쿼리에 둡니다 (공유·새로고침 생존). 공통 훅 **`useUrlState`**(`shared/hooks/use-url-state.ts`)를 씁니다 — 스키마로 default·parse를 선언하면 읽기(`params.status`)와 쓰기(`setParams({ status })`)가 되고, 히스토리는 `replace` 통일, 기본값은 URL에서 자동 제거, `resetKeys`로 "필터 바꾸면 page 리셋"이 자동입니다.

```tsx
const [params, setParams] = useUrlState(
  { page: { default: 1, parse: Number }, status: { default: 'all' as UserStatus } },
  { resetKeys: ['page'] },
);
```

참조 구현: `features/admin/users/components/user-table.tsx`, `features/search/components/search-page-view.tsx`. **예외** — 탭 전환 시 다른 파라미터를 전부 초기화해야 하는 화면(`admin/content`)과 토큰·redirect만 읽는 인증 페이지는 훅을 쓰지 않고 인라인이 맞습니다.

## 7. 핵심 공통 컴포넌트

`shared/components/ui/`의 실제 export 이름 기준 (팀 통칭 "WeaverDataTable"/"TabComponent"의 실체):

- **`DataTable<T>`** (`data-table.tsx`) — 제네릭 테이블. `columns: { key, header, cell(row, index) }[]`, `data`, `keyField`, `emptyMessage?`, `onRowClick?`. 어드민 목록 화면들의 표준
- **`Tabs<T extends string>`** (`tabs.tsx`) — 밑줄형 탭. `items: { id, label }[]`, `activeId`, `onChange`. tablist ARIA 포함
- 그 외 원자: `Button`, `Input`, `Card`, `Badge`, `Modal`, `ConfirmDialog`, `Select`, `Pagination`, `Spinner`, `Typography`, `Toast`
- 레이아웃: `AppShell`/`AdminShell`, `Header`, `Sidebar`/`AdminSidebar`(권한 기반 메뉴 필터), `UserMenu`, `SkinToggle`

일부는 `ui/index.ts` 배럴에 없어 직접 경로로 import합니다 (`DataTable`, `Tabs`, `Modal` 등). **`shared/components/ui`에 도메인 종속 코드를 넣지 않는 것**이 경계 규칙입니다.

## 8. Storybook

`.storybook/` 설정, `pnpm --filter core-frontend storybook`(포트 6006). 스토리는 ui 원자 컴포넌트(`*.stories.tsx`)와 디자인 토큰 카탈로그(`stories/tokens/`)에 있습니다 — 새 스킨을 만들면 여기서 눈으로 검증하세요.

## 새 화면을 만들 때 (요약)

1. 슬라이스 생성/확장: `features/{domain}/`에 api → hooks → components
2. 라우트 추가: `app/(적절한 그룹)/.../page.tsx` — 컴포넌트 import만
3. 규칙: apiClient 필수 · semantic 토큰 필수 · 목록 필터는 URL 상태 · 권한 노출 제어는 `hasPermission`

→ 전체 절차는 [10. 새 기능 만들기](10-new-feature.md)

## 더 보기

- 프론트 전용 상세 규칙: [`apps/core-frontend/CLAUDE.md`](../../apps/core-frontend/CLAUDE.md)
- UI 패턴 스킬 (AI용 압축판): [`.agents/skills/weaver-ui-patterns/`](../../.agents/skills/weaver-ui-patterns/)
- 백엔드 응답 포맷 (ApiClient가 파싱하는 것): [01. 백엔드 §5](01-backend.md#5-전역-응답에러-포맷)
