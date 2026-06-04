# 모듈 슬롯 시스템 설계 (frontend self-contained)

> 작성일: 2026-06-04
> 배경: banner PoC(Plan1~3)에서 backend는 self-contained 증명됐으나, frontend는 대시보드(`dashboard-overview.tsx`)가 `BannerSlot`/`PopupBanner`를 **직접 import**해 banner 제거 시 컴파일이 깨졌다. 이 inbound 의존을 슬롯 시스템으로 역전한다.
> 선택: glob codegen 방식(폴더=진실), 최소 슬롯 2개.

---

## 1. 목적

공용 UI 파일(대시보드)이 특정 모듈(banner)을 **모르게** 만들어, 모듈 제거 시 frontend 컴파일이 깨지지 않게 한다.

- **의존 역전**: `대시보드 → banner`(직접 import) → `대시보드 → 슬롯 레지스트리 ← banner(등록)`
- **폴더=진실**: 설치된 모듈만 `features/<id>/dashboard-slots.tsx`를 가지므로, glob으로 레지스트리를 생성하면 설치 여부가 자동 반영.

## 2. 핵심 개념 — 슬롯

슬롯 = UI에 "미리 뚫어둔 빈 자리". 대시보드는 `<ModuleSlot name="dashboard-top" />`로 자리만 선언하고, 설치된 모듈이 그 자리에 자기 컴포넌트를 등록한다. 대시보드는 무엇이 꽂힐지 모른다.

**최소 슬롯 2개:**
- `dashboard-top` — 대시보드 상단 (banner의 MAIN_TOP 인라인 배너)
- `global-popup` — 전역 팝업 (banner의 POPUP 모달)

## 3. 구성 요소

### ① ModuleSlot 컴포넌트 (`apps/core-frontend/src/shared/components/module-slot.tsx`)

레지스트리에서 해당 슬롯에 등록된 컴포넌트들을 렌더. 빈 슬롯이면 아무것도 안 그림(`null`).

```tsx
'use client';
import { SLOT_REGISTRY, type SlotName } from './slot-registry.generated';

export function ModuleSlot({ name }: { name: SlotName }) {
  const entries = SLOT_REGISTRY[name] ?? [];
  return <>{entries.map((Entry, i) => <Entry key={i} />)}</>;
}
```

### ② 모듈의 슬롯 등록 파일 (`apps/core-frontend/src/features/banner/dashboard-slots.tsx`)

banner가 "어느 슬롯에 무엇을 꽂을지" 선언. **banner 폴더 안**이라 banner 제거 시 함께 삭제됨.

```tsx
'use client';
import { BannerSlot } from './components/banner-slot';
import { PopupBanner } from './components/popup-banner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// codegen이 읽는 표준 export 이름: dashboardSlots
export const dashboardSlots = {
  'dashboard-top': () => <BannerSlot slot="MAIN_TOP" apiBase={API_BASE} />,
  'global-popup': () => <PopupBanner apiBase={API_BASE} />,
};
```

> 규약: 각 모듈은 `features/<id>/dashboard-slots.tsx`에서 `dashboardSlots` 객체를 export한다(슬롯명 → 컴포넌트). apiBase 같은 데이터는 등록 파일이 자체 구성(슬롯은 props 없이 호출).

### ③ glob codegen (`scripts/gen-slot-registry.ts`)

`features/*/dashboard-slots.tsx`를 글롭해 슬롯명별로 모듈 컴포넌트를 수집한 `slot-registry.generated.ts`를 생성. 설치된 모듈만 잡히므로 레지스트리가 자동으로 정확.

```ts
// 생성물 예시 (banner 설치 시)
import { dashboardSlots as bannerSlots } from '@/features/banner/dashboard-slots';

export type SlotName = 'dashboard-top' | 'global-popup';
export const SLOT_REGISTRY: Record<SlotName, Array<() => React.ReactNode>> = {
  'dashboard-top': [bannerSlots['dashboard-top']].filter(Boolean),
  'global-popup': [bannerSlots['global-popup']].filter(Boolean),
};
```

- 슬롯명 목록(`SlotName`)은 codegen의 상수(최소 2개)로 고정. 모듈이 정의한 슬롯 키만 수집.
- banner 폴더가 없으면 import/수집에서 자동 누락 → 빈 배열.

### ④ 대시보드 수정 (`apps/core-frontend/src/core/dashboard/components/dashboard-overview.tsx`)

banner 직접 import/JSX 제거 → ModuleSlot으로 교체.

```tsx
// 제거: import { BannerSlot }, import { PopupBanner }, <BannerSlot .../>, <PopupBanner .../>
import { ModuleSlot } from '@/shared/components/module-slot';
// 렌더 위치:
<ModuleSlot name="dashboard-top" />
// ...
<ModuleSlot name="global-popup" />
```

대시보드는 이제 banner를 전혀 import하지 않는다.

### ⑤ 빌드 통합

`package.json`에 codegen을 빌드/개발 전에 실행:
```json
"predev:web": "tsx scripts/gen-slot-registry.ts",
"prebuild:web": "tsx scripts/gen-slot-registry.ts"
```
(실제 dev/build 스크립트명에 맞춰 pre 훅 연결. 또는 build:web 스크립트 앞에 codegen 체이닝.)

`module:remove`/`module:add`(Plan3) 후에도 codegen을 재실행해 레지스트리를 갱신한다(remove.ts/add.ts 끝에 codegen 호출 추가, 또는 사용자가 빌드 시 pre 훅으로 자동).

### ⑥ footprint 갱신 (`banner.feature.ts`)

- `pinpoints`에서 `dashboard-overview.tsx` 관련 항목 **제거**(대시보드는 이제 banner 무관).
- `dashboard-slots.tsx`는 `features/banner/` 안이라 `frontendDirs`에 자동 포함(별도 추가 불필요).
- `slot-registry.generated.ts`는 자동 생성물 → footprint 아님(codegen이 관리).

## 4. 데이터 흐름

```
[빌드/개발 전] codegen: features/*/dashboard-slots.tsx 글롭 → slot-registry.generated.ts
[런타임] 대시보드 렌더 → <ModuleSlot name="dashboard-top"/> → SLOT_REGISTRY['dashboard-top'] 컴포넌트들 렌더
                                                            → banner 설치돼 있으면 BannerSlot, 아니면 빈 배열(null)
```

## 5. self-contained 달성 (검증 시나리오)

```
pnpm module:remove banner
  → features/banner/ 삭제 (dashboard-slots.tsx 포함)
  → codegen 재생성 → slot-registry.generated.ts에서 banner import/수집 누락 → 빈 배열
  → 대시보드(ModuleSlot)는 무수정, 빈 슬롯 렌더
  → ★ frontend typecheck/build 통과 (banner 없어도 안 깨짐) ← Plan3에서 깨졌던 부분 해소
pnpm module:add banner
  → features/banner/ 복원 → codegen 재생성 → banner 다시 수집 → 대시보드에 배너 재등장
```

## 6. 에러 처리

- 모듈의 `dashboardSlots`에 정의되지 않은 슬롯명은 codegen이 무시(해당 슬롯 빈 배열).
- `slot-registry.generated.ts` 미생성 상태로 빌드 시 → import 실패. 방지: pre 훅으로 항상 먼저 생성 + 빈 레지스트리라도 생성(모듈 0개여도 유효한 빈 파일).
- ModuleSlot은 빈 배열에 안전(`?? []`).

## 7. 테스트

- codegen 단위 테스트: banner 폴더 유/무에 따라 생성물이 올바른지(import 포함/누락).
- ModuleSlot 렌더: 빈 슬롯 → null, 등록된 슬롯 → 컴포넌트 렌더.
- 통합: Plan3 왕복(remove→codegen→frontend build 통과→add→재등장).

## 8. 범위 밖 (후속)

- 슬롯 추가(dashboard-bottom/sidebar 등) — 필요 시 SlotName에 추가.
- 슬롯 우선순위/정렬(여러 모듈이 같은 슬롯) — 현재는 수집 순서.
- backend 등록도 glob codegen으로 승급(Plan3 방식 B) — 이 슬롯 codegen이 선례.
- 슬롯에 props/context 전달 일반화 — 현재는 등록 파일이 자체 구성.

## 관련 문서
- Plan3 라이프사이클: `docs/specs/2026-06-04-module-banner-poc-plan3-lifecycle.md`
- 2단계 카탈로그: `docs/specs/2026-05-31-module-catalog.md`
