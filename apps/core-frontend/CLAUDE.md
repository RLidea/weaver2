# Web App (apps/core-frontend) Guidelines

## 디렉토리 구조

```
src/
├── app/                        # 라우팅 전용 (Next.js App Router)
│   ├── (auth)/                 # 비인증 사용자 전용 (로그인, 회원가입)
│   ├── (protected)/            # 인증 필수
│   ├── (public)/               # 누구나 접근 가능
│   └── (admin)/                # 관리자 전용 (ADMIN.ACCESS 권한 필수)
│
├── core/                       # 플랫폼 핵심 슬라이스 (auth, user, notification, dashboard, terms)
│   └── {domain}/               # 내부 구조는 features/와 동일
│
├── features/                   # 업무 기능 슬라이스 (board, search, admin/*)
│   └── {domain}/
│       ├── api/{domain}.api.ts # API 호출 함수 (Repository 역할)
│       ├── hooks/              # 비즈니스 로직 + 상태 (Service 역할)
│       ├── components/         # 이 도메인 전용 UI
│       ├── query-keys.ts       # React Query 키 팩토리
│       └── types.ts            # 도메인 타입
│
├── shared/                     # 여러 슬라이스가 공통으로 사용
│   ├── components/ui/          # 재사용 가능한 UI 원자 컴포넌트
│   ├── components/layout/      # AppShell, AdminShell, 사이드바 등
│   └── hooks/                  # 공통 유틸 훅
│
├── infrastructure/             # 앱 전체 설정
│   ├── api-client.ts           # ApiClient 싱글톤 (클라이언트 컴포넌트용)
│   ├── server-api.ts           # serverFetch (서버 컴포넌트 전용)
│   ├── query-client.ts         # React Query 설정
│   └── providers/              # React Context Provider
│
├── skins/                      # 스킨 시스템
│   ├── {skin-name}.css         # 스킨별 CSS 변수 정의
│   └── index.ts                # SkinId 타입, SKINS 레지스트리
│
├── proxy.ts                    # 엣지 미들웨어 (Next.js 16: middleware.ts의 새 이름)
└── types/                      # 전역 공유 타입
```

---

## 새 기능 추가 패턴

### 도메인 추가 시 (예: posts)

```
features/posts/
├── api/posts.api.ts      # postsApi 객체
├── hooks/
│   ├── use-posts.ts      # 목록 조회
│   └── use-post.ts       # 단건 조회
├── components/
│   └── post-card.tsx     # posts 전용 UI
└── types.ts
```

### 페이지 추가 시

```tsx
// app/(protected)/posts/page.tsx — 라우팅 진입점만
import { PostList } from '@/features/posts/components/post-list'

export default function PostsPage() {
  return <PostList />
}
```

페이지 파일에 비즈니스 로직을 직접 작성하지 않는다. 반드시 `features/`의 컴포넌트를 가져다 쓴다.

### API 훅 작성 시

```ts
// features/{domain}/api/{domain}.api.ts
import { apiClient } from '@/infrastructure/api-client'

export const postsApi = {
  getAll: () => apiClient.get<Post[]>('/v1/posts'),
  getById: (id: string) => apiClient.get<Post>(`/v1/posts/${id}`),
  create: (body: CreatePostDto) => apiClient.post<Post>('/v1/posts', body),
}
```

```ts
// features/{domain}/hooks/use-posts.ts
import { useQuery } from '@tanstack/react-query'
import { postsApi } from '../api/posts.api'

export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: postsApi.getAll,
  })
}
```

---

## 스킨 시스템 규칙

컴포넌트에서 색상/반경/그림자는 반드시 **semantic 토큰**을 사용한다.

```tsx
// ✅ 올바른 방법 — 토큰 참조
<div className="bg-surface text-text border border-border rounded-md">

// ❌ 금지 — 하드코딩
<div className="bg-white text-gray-900 border border-gray-200 rounded-md">
```

### 사용 가능한 토큰 목록

**색상**

| 토큰 | 용도 |
|------|------|
| `bg-bg` | 페이지 배경 |
| `bg-surface` | 카드/패널 배경 |
| `bg-surface-2` | 중첩된 패널 배경 |
| `border-border` | 기본 테두리 |
| `bg-primary` / `text-primary` | 브랜드 컬러 |
| `text-primary-fg` | primary 위의 텍스트 |
| `text-text` | 본문 텍스트 |
| `text-text-muted` | 보조 텍스트 |
| `bg-error` / `text-error` | 오류 |
| `bg-success` / `text-success` | 성공 |
| `bg-warning` / `text-warning` | 경고 |

**형태**

| 토큰 | 용도 |
|------|------|
| `rounded-sm/md/lg` | 반경 |
| `shadow-[var(--shadow-card)]` | 카드 그림자 |
| `backdrop-blur-[var(--blur-backdrop)]` | 배경 블러 (글래스) |

**타이포그래피** — `text-*`, `font-*`, `leading-*`, `tracking-*` 클래스가 스킨 토큰으로 위임됨

| 토큰 | 클래스 | 용도 |
|------|--------|------|
| `--skin-font-size-xs~4xl` | `text-xs` ~ `text-4xl` | 글자 크기 |
| `--skin-font-weight-*` | `font-normal/medium/semibold/bold` | 굵기 |
| `--skin-leading-*` | `leading-tight/normal/relaxed` | 행간 |
| `--skin-tracking-*` | `tracking-tight/normal/wide` | 자간 |

> 타이포그래피는 직접 Tailwind 클래스를 쓰거나, `<Typography variant="h1|h2|h3|h4|body|body-sm|label|caption">` 컴포넌트를 사용한다.

### 새 스킨 추가 시

1. `skins/{skin-name}.css` 생성 — `[data-skin="{skin-name}"]` 셀렉터로 토큰 값 정의
2. `skins/index.ts`의 `SkinId` 유니온 타입과 `SKINS` 배열에 추가

---

## 금지 사항

```
❌ app/ 파일에 비즈니스 로직 작성
❌ fetch() 직접 사용 (반드시 apiClient 사용)
❌ 컴포넌트에 색상 하드코딩 (semantic 토큰 사용)
❌ infrastructure/ 직접 수정 (확장만 허용)
❌ shared/components/ui/에 도메인 종속 코드 작성
```

## import 경로 규칙

```ts
@/infrastructure/...   // ApiClient, Provider
@/shared/...           // 공통 컴포넌트, 공통 훅
@/features/{domain}/.. // 도메인 내부 참조
@/skins/...            // 스킨 레지스트리
@/types/...            // 전역 타입
```
