# Banner 모듈 프론트엔드 구현 계획 (Plan 2 / 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** banner 모듈의 프론트엔드(관리자 CRUD UI + 사용자 노출 컴포넌트)를 board admin 패턴으로 구현해, 관리자가 화면에서 배너를 등록/수정/삭제하고 로그인 사용자 대시보드에 노출되게 한다.

**Architecture:** `features/admin/banners/`(api·hooks·components)로 관리자 CRUD, `app/(admin)/admin/banners/page.tsx` 독립 페이지 + 사이드바 메뉴 등록. `features/banner/`로 공개 조회 컴포넌트(`BannerSlot`·`PopupBanner`)를 만들어 `(protected)/dashboard`에 삽입. 이미지는 upload API로 올린 `imageFileId`를 `/v1/upload/:id/file`로 표시.

**Tech Stack:** Next.js(App Router), TanStack Query, ApiClient, Tailwind(시맨틱 토큰), 공통 UI(`@/shared/components/ui/*`).

> **설계 제약 (탐색으로 확인):**
> 1. **이미지 서빙은 인증 필요** — `GET /v1/upload/:id/file`은 `@Public`이 없어 로그인 쿠키가 있어야 302가 동작한다. 따라서 이번 Plan은 공개 노출을 **로그인 영역(`(protected)`)에 한정**한다. 비로그인 공개 메인 배너는 upload `serveFile`에 `@Public`이 필요 → **후속 과제**(Plan 범위 밖).
> 2. **board admin은 `/admin/content?tab=boards`로 redirect되는 탭 구조**지만, banner는 self-contained PoC라 **독립 `admin/banners` 페이지**로 둔다(제거 시 content 페이지 무수정 → 클린).
> 3. `ImageIcon`이 `@/shared/components/ui/icons`에 없어 **추가**한다.
> 4. next/image 도메인 설정을 피하려 이미지 표시는 일반 `<img>`를 쓴다(PoC 단순화).

---

## 파일 구조

**생성:**
- `apps/core-frontend/src/features/admin/banners/types.ts`
- `apps/core-frontend/src/features/admin/banners/query-keys.ts`
- `apps/core-frontend/src/features/admin/banners/api/admin-banners.api.ts`
- `apps/core-frontend/src/features/admin/banners/api/banner-upload.api.ts`
- `apps/core-frontend/src/features/admin/banners/hooks/use-admin-banners.ts`
- `apps/core-frontend/src/features/admin/banners/hooks/use-admin-banner-mutations.ts`
- `apps/core-frontend/src/features/admin/banners/components/banner-table.tsx`
- `apps/core-frontend/src/features/admin/banners/components/banner-form-fields.tsx` (생성/수정 공용 필드)
- `apps/core-frontend/src/features/admin/banners/components/banner-create-modal.tsx`
- `apps/core-frontend/src/features/admin/banners/components/banner-edit-modal.tsx`
- `apps/core-frontend/src/features/admin/banners/components/banner-delete-dialog.tsx`
- `apps/core-frontend/src/app/(admin)/admin/banners/page.tsx`
- `apps/core-frontend/src/features/banner/types.ts`
- `apps/core-frontend/src/features/banner/query-keys.ts`
- `apps/core-frontend/src/features/banner/api/banner.api.ts`
- `apps/core-frontend/src/features/banner/hooks/use-banners.ts`
- `apps/core-frontend/src/features/banner/components/banner-slot.tsx`
- `apps/core-frontend/src/features/banner/components/popup-banner.tsx`
- `apps/core-frontend/src/features/banner/lib/banner-image-url.ts` (fileId → 서빙 URL)

**수정:**
- `apps/core-frontend/src/shared/components/ui/icons.tsx` — `ImageIcon` 추가
- `apps/core-frontend/src/shared/components/layout/admin-sidebar.tsx` — `NAV_ITEMS`에 "배너 관리"
- `apps/core-frontend/src/app/(protected)/dashboard/page.tsx` (또는 해당 메인) — `<BannerSlot slot="MAIN_TOP" />` 삽입
- `.gitkeep` 제거: `features/banner/`, `features/admin/banners/`, `app/(admin)/admin/banners/`에 실제 파일이 생기면 Plan 1에서 둔 `.gitkeep` 삭제

> 구현 전 `Modal`/`Input`/`Button`/`Spinner`의 실제 props를 `@/shared/components/ui/*`에서 1회 확인하고, board admin 컴포넌트(`features/admin/boards/components/*`)의 실제 사용형을 대조해 맞춘다.

---

## Task 1: 관리자 타입 · query-keys · API

**Files:** `features/admin/banners/types.ts`, `query-keys.ts`, `api/admin-banners.api.ts`

- [ ] **Step 1: types.ts**

```typescript
export type BannerSlotValue = 'MAIN_TOP' | 'MAIN_BOTTOM' | 'SIDEBAR' | 'POPUP';

export interface AdminBanner {
  id: string;
  title: string;
  imageFileId: string;
  linkUrl: string | null;
  slot: BannerSlotValue;
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBannerRequest {
  title: string;
  imageFileId: string;
  linkUrl?: string;
  slot: BannerSlotValue;
  isActive?: boolean;
  sortOrder?: number;
  startsAt?: string;
  endsAt?: string;
}

export type UpdateBannerRequest = Partial<CreateBannerRequest>;

export const BANNER_SLOTS: { value: BannerSlotValue; label: string }[] = [
  { value: 'MAIN_TOP', label: '메인 상단' },
  { value: 'MAIN_BOTTOM', label: '메인 하단' },
  { value: 'SIDEBAR', label: '사이드바' },
  { value: 'POPUP', label: '팝업' },
];
```

- [ ] **Step 2: query-keys.ts**

```typescript
export const adminBannerKeys = {
  all: ['admin', 'banners'] as const,
  detail: (id: string) => ['admin', 'banners', id] as const,
};
```

- [ ] **Step 3: api/admin-banners.api.ts**

```typescript
import { apiClient } from '@/infrastructure/api-client';
import type { AdminBanner, CreateBannerRequest, UpdateBannerRequest } from '../types';

export const adminBannersApi = {
  getAll: () => apiClient.get<AdminBanner[]>('/v1/admin/banners'),
  getById: (id: string) => apiClient.get<AdminBanner>(`/v1/admin/banners/${id}`),
  create: (body: CreateBannerRequest) => apiClient.post<AdminBanner>('/v1/admin/banners', body),
  update: (id: string, body: UpdateBannerRequest) =>
    apiClient.patch<AdminBanner>(`/v1/admin/banners/${id}`, body),
  delete: (id: string) => apiClient.delete<void>(`/v1/admin/banners/${id}`),
};
```

- [ ] **Step 4: Commit** (구현 묶음 단위로 모아 커밋 — 오케스트레이터가 승인 후 수행)

---

## Task 2: 이미지 업로드 API + ImageIcon

**Files:** `features/admin/banners/api/banner-upload.api.ts`, `shared/components/ui/icons.tsx`(수정)

- [ ] **Step 1: banner-upload.api.ts**

`apiClient.postForm`(FormData)로 단일 이미지 업로드 → 반환 배열 첫 요소. 정확한 반환 타입은 board의 `features/board/api/upload.api.ts`에서 `FileDto`(id/url/thumbnailUrl) 형태 확인 후 맞춘다.

```typescript
import { apiClient } from '@/infrastructure/api-client';

export interface UploadedImage {
  id: string;
  url: string;
  thumbnailUrl: string | null;
}

export const bannerUploadApi = {
  uploadImage: (file: File): Promise<UploadedImage> => {
    const formData = new FormData();
    formData.append('files', file);
    return apiClient
      .postForm<UploadedImage[]>('/v1/upload', formData)
      .then((res) => res.data[0]);
  },
};
```

- [ ] **Step 2: icons.tsx에 ImageIcon 추가**

기존 아이콘들과 동일 형식(`IconProps`, `currentColor` stroke)으로 추가. 기존 아이콘 1개를 복사해 path만 이미지(사진) 모양으로 교체:

```tsx
export function ImageIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}
```

> `IconProps` 타입/내보내기 방식은 icons.tsx 상단을 그대로 따른다.

- [ ] **Step 3: Commit**

---

## Task 3: 관리자 훅 (쿼리 + 뮤테이션)

**Files:** `hooks/use-admin-banners.ts`, `hooks/use-admin-banner-mutations.ts`

- [ ] **Step 1: use-admin-banners.ts**

```typescript
import { useQuery } from '@tanstack/react-query';
import { adminBannersApi } from '../api/admin-banners.api';
import { adminBannerKeys } from '../query-keys';

export function useAdminBanners() {
  return useQuery({
    queryKey: adminBannerKeys.all,
    queryFn: () => adminBannersApi.getAll(),
    select: (res) => res.data,
    staleTime: 30_000,
  });
}
```

- [ ] **Step 2: use-admin-banner-mutations.ts**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminBannersApi } from '../api/admin-banners.api';
import { adminBannerKeys } from '../query-keys';
import type { CreateBannerRequest, UpdateBannerRequest } from '../types';

export function useCreateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBannerRequest) => adminBannersApi.create(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: adminBannerKeys.all }),
  });
}

export function useUpdateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBannerRequest }) =>
      adminBannersApi.update(id, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: adminBannerKeys.all }),
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminBannersApi.delete(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: adminBannerKeys.all }),
  });
}
```

- [ ] **Step 3: Commit**

---

## Task 4: 관리자 컴포넌트 (폼필드 · 테이블 · 생성/수정 모달 · 삭제)

**Files:** `components/banner-form-fields.tsx`, `banner-table.tsx`, `banner-create-modal.tsx`, `banner-edit-modal.tsx`, `banner-delete-dialog.tsx`

> 구현 전 board admin 모달(`features/admin/boards/components/board-create-modal.tsx`, `board-edit-modal.tsx`)의 `Modal`/`Input`/`Button` 실제 props·import를 확인해 동일하게 맞춘다.

- [ ] **Step 1: banner-form-fields.tsx (생성/수정 공용 입력 필드)**

이미지 업로드(파일 선택 → `bannerUploadApi.uploadImage` → `imageFileId` 세팅 + 미리보기), 제목, slot select, linkUrl, sortOrder, isActive, 게시기간(startsAt/endsAt datetime-local). 상태는 부모가 관리하고 값/세터를 props로 받는다.

```tsx
'use client';

import { Input } from '@/shared/components/ui/input';
import { bannerUploadApi } from '../api/banner-upload.api';
import { BANNER_SLOTS, type BannerSlotValue } from '../types';

export interface BannerFormValues {
  title: string;
  imageFileId: string;
  linkUrl: string;
  slot: BannerSlotValue;
  sortOrder: number;
  isActive: boolean;
  startsAt: string; // datetime-local 문자열 또는 ''
  endsAt: string;
}

interface Props {
  values: BannerFormValues;
  onChange: <K extends keyof BannerFormValues>(key: K, val: BannerFormValues[K]) => void;
  apiBase: string; // 이미지 미리보기 URL 구성용
}

export function BannerFormFields({ values, onChange, apiBase }: Props) {
  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploaded = await bannerUploadApi.uploadImage(file);
    onChange('imageFileId', uploaded.id);
  };

  return (
    <div className="space-y-4">
      <Input label="제목" value={values.title} onChange={(e) => onChange('title', e.target.value)} required autoFocus />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text">이미지</label>
        <input type="file" accept="image/*" onChange={handleImage} className="text-sm text-text-muted" />
        {values.imageFileId && (
          <img
            src={`${apiBase}/v1/upload/${values.imageFileId}/file`}
            alt="미리보기"
            className="mt-2 h-24 w-auto rounded-md border border-border object-cover"
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text">슬롯</label>
        <select
          value={values.slot}
          onChange={(e) => onChange('slot', e.target.value as BannerSlotValue)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
        >
          {BANNER_SLOTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <Input label="링크 URL (선택)" value={values.linkUrl} onChange={(e) => onChange('linkUrl', e.target.value)} placeholder="https://..." />
      <Input label="순서" type="number" value={values.sortOrder} onChange={(e) => onChange('sortOrder', Number(e.target.value))} />
      <Input label="게시 시작 (선택)" type="datetime-local" value={values.startsAt} onChange={(e) => onChange('startsAt', e.target.value)} />
      <Input label="게시 종료 (선택)" type="datetime-local" value={values.endsAt} onChange={(e) => onChange('endsAt', e.target.value)} />

      <div className="flex items-center gap-2">
        <input type="checkbox" id="banner-active" checked={values.isActive} onChange={(e) => onChange('isActive', e.target.checked)} className="rounded" />
        <label htmlFor="banner-active" className="text-sm text-text">활성</label>
      </div>
    </div>
  );
}
```

> `apiBase`는 ApiClient가 쓰는 base URL과 동일해야 한다. 노출된 env(예: `process.env.NEXT_PUBLIC_API_URL`)를 board가 어떻게 참조하는지 확인 후 동일 사용. 미확인 시 `apiClient`가 base를 노출하는지 점검.

- [ ] **Step 2: banner-table.tsx** — `useAdminBanners()`로 목록, board-table 패턴(HTML table + 시맨틱 토큰). 제목/슬롯/활성/순서/액션(수정·삭제) 컬럼, "배너 만들기" 버튼, 생성/수정/삭제 모달 상태 관리. (탐색 보고서 A-5 코드를 기준으로, 실제 `Spinner`/`Button` props 확인 후 사용)

- [ ] **Step 3: banner-create-modal.tsx** — `BannerFormFields` + `useCreateBanner`. 제출 시 빈 문자열 게시기간은 omit, `linkUrl` 빈 값은 omit. `mutate(body, { onSuccess: handleClose })`.

```tsx
// 제출 변환 예시
const body: CreateBannerRequest = {
  title: v.title.trim(),
  imageFileId: v.imageFileId,
  slot: v.slot,
  sortOrder: v.sortOrder,
  isActive: v.isActive,
  ...(v.linkUrl.trim() ? { linkUrl: v.linkUrl.trim() } : {}),
  ...(v.startsAt ? { startsAt: new Date(v.startsAt).toISOString() } : {}),
  ...(v.endsAt ? { endsAt: new Date(v.endsAt).toISOString() } : {}),
};
```

- [ ] **Step 4: banner-edit-modal.tsx** — `useEffect`로 대상 배너 → `BannerFormValues` 초기화(서버 ISO → datetime-local 변환), `useUpdateBanner`. board-edit-modal 패턴.

- [ ] **Step 5: banner-delete-dialog.tsx** — 탐색 보고서 A-8 코드. `useDeleteBanner`, `mutate(id, { onSuccess: onClose })`.

- [ ] **Step 6: Commit**

---

## Task 5: 관리자 페이지 + 사이드바 메뉴

**Files:** `app/(admin)/admin/banners/page.tsx`, `shared/components/layout/admin-sidebar.tsx`(수정), `.gitkeep` 제거

- [ ] **Step 1: page.tsx**

```tsx
'use client';

import { PERMISSIONS } from '@weaver2/shared';
import { RequirePermission } from '@/shared/components/auth/require-permission';
import { BannerTable } from '@/features/admin/banners/components/banner-table';

export default function AdminBannersPage() {
  return (
    <RequirePermission permission={PERMISSIONS.BANNER.MANAGE}>
      <div>
        <h1 className="text-2xl font-semibold text-text">배너 관리</h1>
        <p className="mt-1 text-sm text-text-muted">메인/사이드/팝업 배너를 등록하고 노출을 제어합니다.</p>
        <div className="mt-6">
          <BannerTable />
        </div>
      </div>
    </RequirePermission>
  );
}
```

> `RequirePermission`의 정확한 prop 이름(`permission` 등)을 `shared/components/auth/require-permission.tsx`에서 확인해 맞춘다.

- [ ] **Step 2: admin-sidebar.tsx — NAV_ITEMS에 배너 추가**

`ImageIcon`을 icons import에 추가하고, `NAV_ITEMS` 배열에 board 항목과 동일 형식으로:

```tsx
import { /* 기존들 */, ImageIcon } from '@/shared/components/ui/icons';

// NAV_ITEMS 안에 (콘텐츠 관련 항목 근처)
{ label: '배너 관리', href: '/admin/banners', Icon: ImageIcon, permission: PERMISSIONS.BANNER.MANAGE, exact: false },
```

> 실제 NAV_ITEMS 항목의 키 이름(`Icon` vs `icon`, `permission` 위치)을 파일에서 확인해 정확히 맞춘다. 필터링은 기존 `hasPermission` 로직이 자동 처리.

- [ ] **Step 3: .gitkeep 제거** — `features/admin/banners/.gitkeep`, `app/(admin)/admin/banners/.gitkeep` (실제 파일이 생겼으므로). `features/banner/.gitkeep`은 Task 6에서 제거.

- [ ] **Step 4: Commit**

---

## Task 6: 사용자 공개 노출 (BannerSlot · PopupBanner)

**Files:** `features/banner/{types,query-keys}.ts`, `api/banner.api.ts`, `hooks/use-banners.ts`, `lib/banner-image-url.ts`, `components/banner-slot.tsx`, `components/popup-banner.tsx`

- [ ] **Step 1: types.ts / query-keys.ts**

```typescript
// types.ts — 관리자 AdminBanner와 동일 형태(공개 응답도 동일 DTO)
export type { AdminBanner as Banner, BannerSlotValue } from '@/features/admin/banners/types';
```
```typescript
// query-keys.ts
export const bannerKeys = {
  bySlot: (slot: string) => ['banners', 'slot', slot] as const,
};
```

- [ ] **Step 2: api/banner.api.ts**

```typescript
import { apiClient } from '@/infrastructure/api-client';
import type { Banner, BannerSlotValue } from '../types';

export const bannerApi = {
  getBySlot: (slot: BannerSlotValue) =>
    apiClient.get<Banner[]>(`/v1/banners?slot=${slot}`),
};
```

- [ ] **Step 3: lib/banner-image-url.ts**

```typescript
// imageFileId → 서빙 URL. apiBase는 ApiClient base와 동일해야 함(인증 쿠키로 302 동작).
export function bannerImageUrl(apiBase: string, imageFileId: string): string {
  return `${apiBase}/v1/upload/${imageFileId}/file`;
}
```

- [ ] **Step 4: hooks/use-banners.ts**

```typescript
import { useQuery } from '@tanstack/react-query';
import { bannerApi } from '../api/banner.api';
import { bannerKeys } from '../query-keys';
import type { BannerSlotValue } from '../types';

export function useBannersBySlot(slot: BannerSlotValue) {
  return useQuery({
    queryKey: bannerKeys.bySlot(slot),
    queryFn: () => bannerApi.getBySlot(slot),
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 5: components/banner-slot.tsx** (인라인 배너)

```tsx
'use client';

import { useBannersBySlot } from '../hooks/use-banners';
import { bannerImageUrl } from '../lib/banner-image-url';
import type { BannerSlotValue } from '../types';

interface Props { slot: BannerSlotValue; apiBase: string; }

export function BannerSlot({ slot, apiBase }: Props) {
  const { data: banners = [] } = useBannersBySlot(slot);
  if (banners.length === 0) return null;

  return (
    <div className="space-y-3">
      {banners.map((b) => {
        const img = (
          <img src={bannerImageUrl(apiBase, b.imageFileId)} alt={b.title}
               className="w-full rounded-lg border border-border object-cover" />
        );
        return b.linkUrl ? (
          <a key={b.id} href={b.linkUrl} target="_blank" rel="noopener noreferrer" className="block transition-opacity hover:opacity-90">{img}</a>
        ) : (
          <div key={b.id}>{img}</div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: components/popup-banner.tsx** (slot=POPUP, "오늘 그만보기")

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import { useBannersBySlot } from '../hooks/use-banners';
import { bannerImageUrl } from '../lib/banner-image-url';

const DISMISS_KEY = 'banner-popup-dismissed-date';

export function PopupBanner({ apiBase }: { apiBase: string }) {
  const { data: banners = [] } = useBannersBySlot('POPUP');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (banners.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(DISMISS_KEY) !== today) setOpen(true);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const b = banners[0];

  const dismissToday = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString().slice(0, 10));
    setOpen(false);
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)} title={b.title} size="md">
      <div className="space-y-4">
        <a href={b.linkUrl ?? '#'} target={b.linkUrl ? '_blank' : undefined} rel="noopener noreferrer">
          <img src={bannerImageUrl(apiBase, b.imageFileId)} alt={b.title} className="w-full rounded-md" />
        </a>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={dismissToday}>오늘 그만보기</Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>닫기</Button>
        </div>
      </div>
    </Modal>
  );
}
```

> `Modal`/`Button` props는 실제 컴포넌트 확인 후 맞춘다.

- [ ] **Step 7: `features/banner/.gitkeep` 제거 + Commit**

---

## Task 7: 대시보드 삽입 + 검증

**Files:** `app/(protected)/dashboard/page.tsx`(또는 메인) 수정

- [ ] **Step 1: 대시보드에 배너 삽입**

`apiBase`를 ApiClient base와 동일하게 구해서(Task 4 Step 1 노트 참조) 상단에 인라인 배너, 페이지 내 팝업을 둔다:

```tsx
import { BannerSlot } from '@/features/banner/components/banner-slot';
import { PopupBanner } from '@/features/banner/components/popup-banner';

// 페이지 상단 컨텐츠 영역에:
<BannerSlot slot="MAIN_TOP" apiBase={apiBase} />
// 페이지 어딘가(렌더 위치 무관):
<PopupBanner apiBase={apiBase} />
```

> 실제 대시보드 페이지 경로와 컴포넌트가 server/client인지 확인. `apiBase`를 클라이언트에서 얻는 방법(`process.env.NEXT_PUBLIC_*`)이 board에서 쓰는 방식과 일치해야 한다.

- [ ] **Step 2: 빌드 검증**

Run: `pnpm build:web` (next build core-frontend)
Expected: 타입/빌드 에러 0

- [ ] **Step 3: 수동 브라우저 검증 (사용자가 프론트 dev 서버 실행 — 에이전트는 dev 서버 실행 금지)**

사용자에게 요청:
1. admin 계정 로그인 → 좌측 사이드바에 **"배너 관리"** 메뉴 노출 확인 (권한 없는 계정엔 미노출)
2. `/admin/banners` → "배너 만들기" → 이미지 업로드 + slot=MAIN_TOP + 제목 → 생성 → 목록에 표시
3. 대시보드(`/dashboard`)에서 **MAIN_TOP 배너 이미지 노출** 확인 (로그인 상태라 이미지 서빙 OK)
4. slot=POPUP 배너 생성 → 대시보드 재방문 시 팝업 표시 → "오늘 그만보기" → 새로고침해도 안 뜸
5. 수정(비활성) → 대시보드에서 사라짐, 삭제 → 목록/대시보드에서 제거

- [ ] **Step 4: Commit**

---

## Self-Review 결과

- **Spec 커버리지:** 스펙 7절(프론트: admin CRUD + 공개 BannerSlot/PopupBanner) 전부 태스크화. 관리자 메뉴 노출(권한 기반), 이미지 업로드, 게시기간/슬롯/활성 제어 포함.
- **제약 명시:** ① 이미지 서빙 인증 필요 → 공개 노출을 `(protected)` 한정(비로그인 공개 배너는 후속) ② board는 content 탭이나 banner는 독립 페이지(클린 제거) ③ ImageIcon 추가 ④ next/image 대신 `<img>`.
- **타입 일관성:** `AdminBanner`/`Banner` 동일 형태(공개 응답도 같은 DTO), `BannerSlotValue` 공유, mutation 시그니처 일관.
- **미확정(구현 시 확인):** `Modal/Input/Button/Spinner` 실제 props, `RequirePermission` prop명, `NAV_ITEMS` 키명, `apiBase` 노출 방식, board upload.api의 FileDto 반환형 — 각 Task에 확인 노트.
- **footprint 영향:** Plan 1에서 `.gitkeep`으로 예약한 frontend 경로에 실제 파일이 생기므로 `.gitkeep` 제거. `proxy.ts`는 `/admin`이 이미 PROTECTED라 banner 전용 추가 불필요(공개 `/banners` 라우트 없음 — 컴포넌트 삽입 방식).

## 다음 단계
- Plan 2 완료 후 → **Plan 3 (Phase 2 라이프사이클)**: extract → catalog → remove → add 왕복 + codegen. banner의 backend+frontend 전체 footprint가 갖춰진 상태로 "설치/제거"를 검증.
