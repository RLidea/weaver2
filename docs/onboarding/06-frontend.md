# 6. 프론트엔드 (Frontend)

이 장의 목표는 `apps/core-frontend`가 **어떻게 조직돼 있는지**를 이해하는 것입니다. Next.js·React·TanStack Query 문법 자체는 공식 문서에 맡기고, **"weaver2 프론트가 그것들을 어떻게 쓰는가"**에만 집중합니다.

---

## 6.1 전체 구조 한눈에 보기

```
apps/core-frontend/src/
├── app/                  # 라우팅 전용 (Next.js App Router)
│   ├── (auth)/           # 비인증 전용 라우트
│   ├── (protected)/      # 인증 필수 라우트
│   ├── (public)/         # 누구나 접근 가능
│   └── (admin)/          # 관리자 전용 라우트
│
├── core/                 # 프레임워크급 도메인 (auth, user, notification, terms)
├── features/             # 비즈니스 도메인 슬라이스 (banner, board, search …)
├── shared/               # 여러 도메인이 공통으로 쓰는 것
├── infrastructure/       # 앱 전체 설정 (ApiClient, QueryClient, Provider)
├── skins/                # 스킨 시스템
└── types/                # 전역 공유 타입
```

계층 간 의존 방향은 **단방향**입니다.

```
app/ → features/ or core/
features/ → shared/ → infrastructure/
(역방향 import는 금지)
```

> 📌 **기억할 것**: `app/`은 라우팅 진입점만 담습니다. 비즈니스 로직이 `app/`에 있다면 잘못된 위치입니다. 반드시 `features/` 또는 `core/`로 옮기세요.

---

## 6.2 App Router — 라우트 그룹

`app/` 디렉토리는 Next.js App Router의 파일 기반 라우팅을 그대로 따르되, **(그룹명)** 으로 라우트를 분리합니다. 괄호 그룹은 URL에 나타나지 않고, **레이아웃과 인증 제어만 분리**하는 역할입니다.

| 그룹 | 경로 예시 | 역할 | 핵심 파일 |
|------|----------|------|----------|
| `(auth)` | `/login`, `/sign-up`, `/forgot-password` | 비인증 사용자 전용. 로그인 상태면 이미 들어올 이유가 없는 페이지. | `app/(auth)/layout.tsx` |
| `(protected)` | `/dashboard`, `/boards/…`, `/settings/…` | **인증 필수**. layout에서 `useMe()`로 인증을 확인하고, 미인증 시 `/login?redirect=…`으로 리다이렉트. | `app/(protected)/layout.tsx` |
| `(public)` | `/`(홈), `/reset-password` | 누구나 접근. 특별한 인증 제어 없음. | `app/(public)/layout.tsx` |
| `(admin)` | `/admin`, `/admin/users`, `/admin/boards` … | 관리자 전용 UI. 별도 레이아웃(`AdminSidebar`, `AdminHeader`). | `app/(admin)/layout.tsx` |

`(protected)/layout.tsx`가 인증 가드를 구현하는 방식을 간략히 보면:

```tsx
// app/(protected)/layout.tsx (발췌)
export default function ProtectedLayout({ children }) {
  const { isAuthenticated, isLoading } = useMe();
  // 미인증 → /login?redirect=<현재 경로> 로 교체
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (!isAuthenticated) return null;
  return <AppShell>{children}</AppShell>;
}
```

> ⚠️ **트러블슈팅 — 페이지가 깜빡이며 로그인으로 튕겨요**
>
> `(protected)` 그룹에 속한 페이지에 서버 컴포넌트를 넣으면, 클라이언트 레이아웃의 인증 확인 전에 서버 사이드 렌더링이 먼저 일어나 깜빡임이 생길 수 있습니다. 인증이 필요한 페이지의 진짜 데이터 로딩은 `features/`의 훅(TanStack Query)에 맡기고, 페이지 파일(`page.tsx`)은 컴포넌트 조합만 담으세요.

페이지 파일은 이렇게만 씁니다:

```tsx
// app/(protected)/boards/page.tsx — 진입점만, 로직 없음
import { BoardList } from '@/features/board/components/board-list';

export default function BoardsPage() {
  return <BoardList />;
}
```

---

## 6.3 `core/` vs `features/` — 두 도메인 계층

`src/` 아래에 도메인 코드가 두 군데 있습니다. 처음 보면 헷갈리니 먼저 구분합니다.

| 계층 | 경로 | 내용 | 판단 기준 |
|------|------|------|----------|
| `core/` | `src/core/` | `auth`, `user`, `notification`, `terms` | 모든 기능이 의존하는 **토대**. 함부로 건드리지 않음 |
| `features/` | `src/features/` | `banner`, `board`, `search` … | **비즈니스 기능**. 새 기능은 여기에 추가 |

백엔드의 `core/` ↔ `features/` 분리(`03-backend-fundamentals.md`)와 같은 원칙이 프론트에도 적용됩니다.

> 🔍 **통찰**: `core/user`에는 로그인한 현재 사용자를 가져오는 `useMe()` 훅이 있습니다. 이 훅은 `(protected)` 레이아웃, 사이드바, 헤더 등 앱 전반에서 공통으로 쓰입니다. 비즈니스 feature가 아니기 때문에 `features/`가 아닌 `core/`에 삽니다.

---

## 6.4 Feature-Slice — 도메인의 4분할 구조

`features/{domain}/`(과 `core/{domain}/`)은 하나의 도메인을 **네 관심사**로 나눕니다. 백엔드의 `Controller → Service → Repository`에 대응하는 프론트 패턴입니다.

```
features/{domain}/
├── api/{domain}.api.ts   # API 호출 함수 모음 (Repository 역할)
├── hooks/                # 비즈니스 로직 + 상태 (Service 역할)
│   ├── use-{domain}s.ts  # 목록 조회
│   └── use-{domain}.ts   # 단건 조회
├── components/           # 이 도메인 전용 UI
└── types.ts              # 도메인 타입
```

실제 예시 — `features/banner/` (확인된 파일):

```
features/banner/
├── api/banner.api.ts     # bannerApi 객체
├── dashboard-slots.tsx   # 모듈 레지스트리 슬롯 (8장 참조)
├── query-keys.ts         # TanStack Query 키
└── types.ts              # Banner, BannerSlotValue 타입
```

### api — Repository 역할

모든 API 호출은 `{domain}.api.ts` 한 파일에 모읍니다. 이 파일은 `apiClient`만 씁니다. (`fetch()` 직접 사용 절대 금지 — 6.6절 참조)

```ts
// features/banner/api/banner.api.ts
import { apiClient } from '@/infrastructure/api-client';
import type { Banner, BannerSlotValue } from '../types';

export const bannerApi = {
  getBySlot: (slot: BannerSlotValue) =>
    apiClient.get<Banner[]>(`/v1/banners?slot=${slot}`),
};
```

### hooks — Service 역할

`api`를 TanStack Query로 감싸 **캐싱·로딩·에러** 상태를 제공합니다. 컴포넌트는 이 훅만 호출하고, `apiClient`를 직접 부르지 않습니다.

```ts
// features/{domain}/hooks/use-banners.ts
import { useQuery } from '@tanstack/react-query';
import { bannerApi } from '../api/banner.api';
import { BANNER_QUERY_KEYS } from '../query-keys';

export function useBanners(slot: BannerSlotValue) {
  return useQuery({
    queryKey: BANNER_QUERY_KEYS.bySlot(slot),
    queryFn: () => bannerApi.getBySlot(slot),
  });
}
```

---

## 6.5 `shared/`·`infrastructure/` 경계

### shared/

여러 feature가 공통으로 쓰는 것을 모읍니다.

```
shared/
├── components/
│   ├── ui/           # 원자 UI: Button, Input, Badge, Card, Modal, Spinner …
│   ├── layout/       # AppShell, Header, Sidebar, AdminHeader, AdminSidebar …
│   └── auth/         # RequirePermission (권한 조건부 렌더링)
├── hooks/
│   └── use-api-error.ts
└── lib/
    └── cn.ts         # Tailwind className 병합 유틸
```

> 📌 **기억할 것**: `shared/components/ui/`는 **도메인 무관한 원자 컴포넌트**만 둡니다. 예를 들어 `BannerCard`는 `features/banner/components/`에 두어야 하고, `shared/components/ui/`에 넣으면 안 됩니다.

### infrastructure/

앱 전체에 하나만 존재하는 설정·싱글톤입니다. **직접 수정하지 않고 확장만** 합니다.

```
infrastructure/
├── api-client.ts       # ApiClient 싱글톤 (export: apiClient)
├── query-client.ts     # TanStack QueryClient 설정
├── server-api.ts       # SSR용 서버사이드 API 호출
└── providers/
    ├── auth-provider.tsx   # ApiClient에 onAuthError 주입, 사용자 로드
    ├── query-provider.tsx  # QueryClientProvider 래핑
    ├── skin-provider.tsx   # data-skin 속성 관리
    └── toast-provider.tsx  # 전역 Toast
```

**ApiClient 싱글톤** (`infrastructure/api-client.ts`)은 단순한 `fetch` 래퍼가 아닙니다. 주요 기능:

- **CSRF 토큰 자동 관리** — mutation(POST/PUT/PATCH/DELETE)마다 `x-csrf-token` 헤더 자동 주입, 만료 시 재발급 후 1회 재시도
- **401 토큰 갱신 큐** — 여러 요청이 동시에 401을 받으면 리프레시를 한 번만 시도하고, 나머지는 결과를 기다리는 큐에 쌓음
- **FormData 자동 판별** — `Content-Type`을 FormData면 브라우저에 위임, JSON이면 직접 설정

```ts
// 사용법 — features/{domain}/api/{domain}.api.ts 안에서만
import { apiClient } from '@/infrastructure/api-client';

apiClient.get<T>('/v1/path')
apiClient.post<T>('/v1/path', body)
apiClient.patch<T>('/v1/path', body)
apiClient.delete<T>('/v1/path')
apiClient.postForm<T>('/v1/path', formData)  // 파일 업로드
```

> 💡 **팁**: `apiClient`는 `NEXT_PUBLIC_API_URL`을 기반으로 초기화됩니다. 브라우저에서 `/api`로 시작하는 경로는 `next.config`의 rewrites를 통해 백엔드(`:4000`)로 프록시됩니다(`src/proxy.ts` 참조). `.env.local`의 기본값으로 이미 설정되어 있으니 손댈 필요 없습니다.

---

## 6.6 스킨 시스템

### 구조

스킨은 CSS 변수 묶음입니다. `[data-skin="{skin-name}"]` 셀렉터 아래에 토큰을 정의하고, `skin-provider.tsx`가 `<html>` 태그에 `data-skin` 속성을 설정합니다.

```
skins/
├── default.css   # [data-skin="default"] — 라이트 테마
├── dark.css      # [data-skin="dark"] — 다크 테마
└── index.ts      # SkinId = 'default' | 'dark', SKINS 배열
```

현재 스킨은 두 가지(`default`, `dark`)이고, `skins/index.ts`의 `SkinId` 유니온과 `SKINS` 배열에 등록되어 있습니다.

### semantic 토큰 — 색상 하드코딩 절대 금지

컴포넌트에서 색상·형태·그림자를 쓸 때는 반드시 **semantic 토큰 클래스**를 씁니다.

```tsx
// ✅ 올바른 방법
<div className="bg-surface text-text border border-border rounded-md">

// ❌ 절대 금지 — 스킨 전환이 통하지 않음
<div className="bg-white text-gray-900 border border-gray-200 rounded-md">
```

자주 쓰는 토큰:

| 토큰 클래스 | 용도 |
|------------|------|
| `bg-bg` | 페이지 배경 |
| `bg-surface` | 카드·패널 배경 |
| `bg-surface-2` | 중첩 패널 배경 |
| `border-border` | 기본 테두리 |
| `bg-primary` / `text-primary-fg` | 브랜드 컬러 / 그 위의 텍스트 |
| `text-text` | 본문 텍스트 |
| `text-text-muted` | 보조 텍스트 |
| `bg-error` / `bg-success` / `bg-warning` | 상태 색상 |
| `rounded-sm/md/lg` | 반경 (스킨 토큰으로 위임됨) |

실제 CSS 변수 값은 `skins/default.css`·`skins/dark.css`에 정의되어 있으며, `default`는 `--skin-primary: #6366f1`(인디고), `dark`는 별도 값을 씁니다.

### `<Typography>` 컴포넌트

텍스트 스타일은 `<Typography>` 컴포넌트로 표현합니다 (`shared/components/ui/typography.tsx`). 모든 크기·굵기·행간이 스킨 토큰으로 위임되어, 스킨 교체만으로 앱 전체 타이포그래피가 바뀝니다.

```tsx
import { Typography } from '@/shared/components/ui/typography';

// variant → 시각 스타일, as → HTML 태그 (선택적, 기본값 있음)
<Typography variant="h1">페이지 제목</Typography>
<Typography variant="body">본문 텍스트</Typography>
<Typography variant="caption">타임스탬프 / 힌트</Typography>

// 시각과 의미론 분리 — h2 태그이지만 h3 스타일
<Typography variant="h3" as="h2">서브섹션</Typography>
```

| variant | 기본 태그 | 용도 |
|---------|----------|------|
| `h1`~`h4` | `h1`~`h4` | 제목 계층 |
| `body` | `p` | 기본 본문 |
| `body-sm` | `p` | 보조 설명 |
| `label` | `span` | 폼·UI 레이블 |
| `caption` | `span` | 캡션·힌트·타임스탬프 |

### 새 스킨 추가 시

1. `skins/{skin-name}.css` 생성 — `[data-skin="{skin-name}"]` 셀렉터로 모든 `--skin-*` 변수 재정의
2. `skins/index.ts`의 `SkinId` 유니온과 `SKINS` 배열에 항목 추가

```ts
// skins/index.ts
export type SkinId = 'default' | 'dark' | 'my-brand';  // 추가

export const SKINS: SkinMeta[] = [
  { id: 'default', label: '라이트' },
  { id: 'dark',    label: '다크' },
  { id: 'my-brand', label: '브랜드' },  // 추가
];
```

---

## 6.7 import 경로 규칙

모노레포 TypeScript path alias `@/`는 `apps/core-frontend/src/`를 가리킵니다. 어느 계층에서 무엇을 import할지는 다음 규칙을 따릅니다.

```ts
@/infrastructure/...    // ApiClient, Provider (features에서 api 계층만 참조)
@/shared/...            // 공통 컴포넌트, 공통 훅
@/features/{domain}/... // 도메인 내부 참조 (cross-domain import 피할 것)
@/core/{domain}/...     // 인증·사용자·알림 등 핵심 도메인
@/skins/...             // 스킨 레지스트리
@/types/...             // 전역 타입 (ApiResponse, PaginatedResponse 등)
```

> ⚠️ **트러블슈팅 — `@/` alias가 IDE에서 빨간 줄로 표시돼요**
>
> `apps/core-frontend/tsconfig.json`에 `"paths": { "@/*": ["./src/*"] }`가 설정되어 있어야 합니다. IDE가 모노레포 루트의 `tsconfig.json`을 먼저 읽으면 인식이 안 될 수 있습니다. IDE의 TypeScript 프로젝트 루트를 `apps/core-frontend`로 명시적으로 지정하거나, 루트 `tsconfig.json`의 `references`에 `core-frontend`가 포함됐는지 확인하세요.

---

## 6.8 금지사항 요약

이 규칙들은 `apps/core-frontend/CLAUDE.md`와 프로젝트 루트 `CLAUDE.md`에 모두 명시되어 있습니다.

```
❌ fetch() 직접 사용 — 반드시 apiClient 사용
❌ app/ 파일에 비즈니스 로직 작성 — features/로 이동
❌ 컴포넌트에 색상 하드코딩 — semantic 토큰 클래스 사용
❌ infrastructure/ 직접 수정 — 확장만 허용
❌ shared/components/ui/에 도메인 종속 코드 작성
```

---

## 6.9 새 기능 추가 체크리스트

새 비즈니스 기능 `X`를 추가할 때 따라야 할 파일 생성 순서입니다.

1. **타입 정의** → `features/X/types.ts`
2. **API 함수** → `features/X/api/x.api.ts` (`apiClient` 사용)
3. **쿼리 키** → `features/X/query-keys.ts`
4. **훅 작성** → `features/X/hooks/use-xs.ts` (TanStack Query 래핑)
5. **컴포넌트** → `features/X/components/*.tsx` (semantic 토큰 클래스 사용)
6. **페이지 연결** → `app/(protected)/x/page.tsx` (컴포넌트 import만)

---

## 다음 장

→ **[7장 공유 라이브러리 (libs)](07-libs.md)**
