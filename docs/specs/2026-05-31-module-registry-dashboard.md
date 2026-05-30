# Module Registry 1단계 — 모듈 대시보드 설계

> 작성일: 2026-05-31
> 선행: 0단계(매니페스트+빌더), 0.5단계(추출기+verify). 브랜치 feat/module-registry

---

## 1. 목적

개발자/관리자가 admin에서 **현재 설치된 모듈 + 의존 구조**를 본다 (읽기 전용). 주인님 비전의 ④ 가시성 대시보드 — *"보이기만 해도 OK"*.

## 2. 비범위

- ❌ 설치/제거 액션 (2단계 CLI)
- ❌ 인터랙티브 그래프 다이어그램 라이브러리(react-flow 등) — MVP는 카드/리스트. 시각 다이어그램은 후속.
- ❌ 프론트 footprint(frontendDirs/routes) 자동화 (0.5 비범위 유지)

## 3. 설계

### 3.1 백엔드 — 모듈 그래프 API

- **`GET /v1/admin/modules`** — 권한 `PERMISSIONS.ADMIN.ACCESS`
- 위치: `apps/core-backend/src/system/admin/api/controllers/admin-modules.api.controller.ts` + `services/admin-modules.api.service.ts` (기존 admin-*.api 패턴 동일)
- `admin-api.module.ts`에 등록
- 응답 DTO:
```ts
// admin-modules.api.dto.ts
export class ModuleGraphDto {
  modules: {
    id: string;
    layer: string;
    description: string;
    dependsOn: { id: string; kind: 'hard' | 'soft'; reason?: string }[];
    dependents: string[];           // 역의존 (그래프 계산)
    footprint: {
      backendDir?: string;
      prismaModels?: string[];
      permissions?: string[];
    };
  }[];
  edges: { from: string; to: string; kind: 'hard' | 'soft' }[];
  stats: { moduleCount: number; edgeCount: number; hardCount: number; softCount: number };
}
```
- 구현: `ALL_MANIFESTS`(apps/core-backend/src/features/manifests.ts) + `buildDependencyGraph`(@weaver2/module-registry)로 `dependents` 계산 → DTO 매핑. 순수 조회, 부수효과 0.

### 3.2 프론트 — 모듈 대시보드 페이지

- 라우트: `apps/core-frontend/src/app/(admin)/admin/modules/page.tsx`
- 기능 디렉토리: `apps/core-frontend/src/features/admin/modules/` — api(ApiClient 사용), hook(use-modules), components(module-card, module-stats)
- **UI (weaver-ui-patterns 글래스모피즘 준수)**:
  - 상단: 통계 바 (모듈 수 / 의존 수 / hard·soft 비율)
  - 모듈 카드 목록: 각 카드 = id, layer 배지, description, **의존(→ permission[hard 빨강], board[hard]...)**, **역의존(← 누가 나를)**, footprint 요약(모델·권한 수)
  - hard=강조색, soft=옅은색 배지
- 사이드바 메뉴 추가: `admin-sidebar.tsx`에 `{ label: '모듈', href: '/admin/modules', permission: PERMISSIONS.ADMIN.ACCESS }`
- `proxy.ts`는 `/admin` 일반 prefix로 이미 보호됨 (추가 불필요)

### 3.3 데이터 흐름

```
ALL_MANIFESTS ──buildDependencyGraph──▶ dependents 계산
   │
   └─▶ admin-modules.api.service ──▶ GET /v1/admin/modules (ModuleGraphDto)
                                          │
   apps/web use-modules (ApiClient) ◀─────┘
                                          │
   module-card 카드 목록 + stats ◀────────┘
```

## 4. 검증

- 백엔드: `admin-modules.api.service.spec.ts` — ALL_MANIFESTS로 DTO 생성, dependents·stats 정확.
- 프론트: 빌드 통과 + 라우트 `/admin/modules` 생성 확인 (프론트 단위테스트는 ROADMAP 후속).

## 5. 향후
- 인터랙티브 그래프 다이어그램 (react-flow)
- 2단계: 카드에서 설치/제거 액션 (CLI 연동)

## 관련 문서
- 0단계: docs/specs/2026-05-30-module-registry-design.md / -plan.md
- 0.5단계: docs/specs/2026-05-31-module-registry-extractor.md
