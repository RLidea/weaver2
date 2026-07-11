# 프론트엔드 공유 코드 패키지 추출 (어드민 앱 분리 1단계)

- 날짜: 2026-07-11
- 상태: 승인됨 (진행 중)
- 배경: 외주 프로젝트에서 어드민 분리(admin.xxx.com 또는 별도 앱) 요구가 잦음.
  개인 프로젝트는 단일 앱(xxx.com/admin)을 유지하고 싶음.
  → 배포 형태를 포크가 아니라 설정/조립으로 다루기 위해,
  분리 비용의 8할인 **공유 코드 패키지화**를 템플릿에서 선불로 지불한다.
  앱 분리 자체(2단계)는 프로젝트별 결정으로 남기고, 검증 후 레시피로 기록한다.

## 목표 구조

```
packages/                  # 프론트 전용 pnpm workspace 패키지 (nest libs/와 구분)
├── ui/                    # @weaver2/ui — 순수 UI (외부 의존 없음)
│   └── src/
│       ├── components/    # 기존 shared/components/ui/* (stories 포함)
│       ├── styles/tokens.css  # globals.css의 @theme 토큰 블록
│       ├── skins/         # default.css, dark.css, index.ts(SkinId 레지스트리)
│       ├── providers/     # skin-provider, toast-provider
│       ├── hooks/         # use-url-state
│       └── lib/           # cn
├── api-client/            # @weaver2/api-client — ui 무의존
│   └── src/
│       ├── api-client.ts, query-client.ts, query-provider.tsx
│       ├── server-api.ts  # "./server" 서브패스 (next/headers 사용 — 클라이언트 번들 격리)
│       ├── error-messages.ts  # getApiErrorMessage (use-api-error에서 매핑 추출)
│       └── types/         # api.ts(ApiError), pagination.ts, api-schema.d.ts(생성물)
└── auth/                  # @weaver2/auth — ui, api-client 의존
    └── src/
        ├── (기존 core/auth 슬라이스: api/hooks/components/types/query-keys)
        ├── use-me.ts + me 쿼리키 + User 타입  # core/user에서 이동 (세션 정체성)
        ├── auth-provider.tsx
        └── require-permission.tsx
```

의존 방향: `ui` ← `api-client` ← `auth`. 앱에는 layout shell·features·core(user/notification/terms/dashboard)·라우팅이 남는다.

## 주요 결정사항

| 결정 | 내용 | 이유 |
|------|------|------|
| useMe 위치 | @weaver2/auth로 이동 (주인님 승인) | 세션 정체성 훅 — shell·require-permission·어드민 앱 모두 필요. 쿼리키 값 `['user','me']`는 유지해 기존 invalidation 호환 |
| User 타입 | @weaver2/auth로 이동, core/user는 재참조 | useMe·require-permission(permissions 필드)이 사용 |
| shell/layout | 앱 잔류 | core 훅(user/notification) 결합 — 2단계 분리 시 앱과 함께 이사 |
| use-api-error | 앱 잔류, 메시지 매핑만 getApiErrorMessage로 api-client에 추출 | toast(ui)+ApiError(api) 양쪽 결합 — 패키지 의존 방향 오염 방지 |
| 패키지 배포 | 소스 배포 (빌드 없음) + transpilePackages | 템플릿 단순성. exports가 .ts를 직접 가리킴 |
| Storybook/Playwright | 앱 유지, stories glob만 packages/ui 포함 | 이동 범위 최소화 |

## 진행 단계 (단계별 커밋)

1. 계획 문서 + 워크스페이스 스캐폴딩 (pnpm-workspace, 패키지 3개 골격)
2. @weaver2/ui 추출 — 토큰 CSS 분리, globals.css `@source`, storybook glob
3. @weaver2/api-client 추출 — OpenAPI 파이프라인(gen:api-types)·CI drift check 경로 이관
4. @weaver2/auth 추출 — useMe/User 이동 포함
5. 앱 전역 import 치환 (중복 import 병합 코드모드) + 잔여 정리
6. 문서·스킬 갱신 (CLAUDE.md, weaver-coding-standards/ui-patterns/crud-recipe) + 검증

## 검증 기준

- `pnpm --filter core-frontend lint` 통과
- `pnpm build:web` 통과
- `pnpm --filter core-frontend build-storybook` 통과
- `pnpm openapi:types` 재실행 후 git diff 없음 (drift check 경로 정합)

## 2단계 (이번 범위 아님)

첫 외주 요구 시 앱 분리를 1회 수행해 패키지 경계를 검증하고,
절차를 `weaver-admin-split` 레시피로 기록한다. 분리 브랜치는 유지하지 않는다(부패 방지).
어드민 앱은 빌드 타임 env로 `basePath`(''/'/admin')를 결정해 subdomain/path 모드를 모두 지원한다.
