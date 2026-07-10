---
name: weaver-ui-patterns
description: Weaver2 frontend UI patterns including common components (TabComponent, WeaverDataTable), URL state management, and the default skin's reference styles. Apply when building frontend views, components, or pages.
license: UNLICENSED
metadata:
  author: Weaver2 Team
  version: "1.0.0"
  project: weaver2
---

# Weaver2 UI Patterns

프로젝트 특화 프론트엔드 UI/UX 패턴 가이드

## When to Apply

이 규칙은 다음 상황에서 적용:
- 새로운 페이지/뷰 작성
- UI 컴포넌트 개발
- 기존 UI 리팩토링
- 디자인 시스템 일관성 검토

---

## 🔴 CRITICAL - 공통 컴포넌트 우선

### TabComponent 사용

**규칙:** 탭 UI는 반드시 `TabComponent` 사용

```typescript
// ✅ CORRECT
import { TabComponent } from '@/components/common/TabComponent';

function UserDashboard() {
  return (
    <TabComponent
      tabs={[
        { id: 'profile', label: '프로필', content: <ProfileTab /> },
        { id: 'settings', label: '설정', content: <SettingsTab /> },
      ]}
    />
  );
}

// ❌ WRONG - 커스텀 탭 구현
function UserDashboard() {
  const [activeTab, setActiveTab] = useState('profile');
  return (
    <div className="tabs">
      <button onClick={() => setActiveTab('profile')}>프로필</button>
      {/* 커스텀 구현 금지 */}
    </div>
  );
}
```

### WeaverDataTable 사용

**규칙:** 데이터 테이블은 `WeaverDataTable` 사용

```typescript
// ✅ CORRECT
import { WeaverDataTable } from '@/components/common/WeaverDataTable';

function UserList() {
  return (
    <WeaverDataTable
      columns={columns}
      data={users}
      pagination={true}
      searchable={true}
    />
  );
}

// ❌ WRONG - 일반 table 태그 사용
function UserList() {
  return (
    <table>
      <thead>...</thead>
      <tbody>...</tbody>
    </table>
  );
}
```

**이유:**
- 일관된 스타일링
- 내장된 페이지네이션/검색
- 반응형 지원

---

## 글래스모피즘 디자인 (참고 — 기본 스킨 스타일)

### 디자인 시스템

기본 스킨이 사용하는 글래스모피즘 패턴의 레퍼런스다. **의무 아님** — 프로젝트/스킨에 따라 자유롭게 교체한다 (`apps/core-frontend/src/skins/` 참조).

**CSS 패턴:**
```css
/* 글래스모피즘 카드 */
.card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

**Tailwind 클래스:**
```tsx
<div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-glass">
  {content}
</div>
```

### 컬러 팔레트

색·그림자·블러 값의 **진실 원천은 `apps/core-frontend/src/skins/*.css`의 `--skin-*` 토큰**이다.
스타일 지정 시 색상 하드코딩 대신 스킨 토큰(및 `globals.css`의 매핑 변수: `--shadow-card`, `--blur-backdrop` 등)을 사용한다.
프로젝트별 색은 스킨 파일에서 정의/교체한다.

---

## 🟡 HIGH - URL 상태 관리

### 쿼리 파라미터 활용

**규칙:** 필터/검색/페이지네이션 상태는 URL에 저장

```typescript
// ✅ CORRECT
import { useSearchParams } from 'next/navigation';

function UserList() {
  const searchParams = useSearchParams();
  const page = searchParams.get('page') || '1';
  const search = searchParams.get('search') || '';

  // URL: /users?page=2&search=john
}

// ❌ WRONG - 로컬 state만 사용
function UserList() {
  const [page, setPage] = useState(1);
  // 새로고침 시 상태 손실
}
```

**이유:**
- 북마크 가능
- 뒤로가기 지원
- 공유 가능한 URL

---

## 🟡 HIGH - 반응형 디자인

### 브레이크포인트

```tsx
// ✅ CORRECT - Tailwind 반응형
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>

// 모바일: 1열
// 태블릿: 2열
// 데스크탑: 3열
```

---

## 애니메이션 (참고 — 기본 스킨의 모션 패턴)

### 부드러운 전환

```css
/* 기본 스킨 hover 패턴 — 프로젝트별 교체 가능 */
.card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}
```

---

## 🟢 MEDIUM - 접근성

### 시맨틱 HTML

```tsx
// ✅ CORRECT
<nav>
  <ul>
    <li><a href="/dashboard">대시보드</a></li>
  </ul>
</nav>

<main>
  <h1>사용자 관리</h1>
  <section>...</section>
</main>

// ❌ WRONG
<div>
  <div onClick={...}>대시보드</div>
</div>
```

### ARIA 속성

```tsx
// ✅ CORRECT
<button
  aria-label="사용자 삭제"
  aria-pressed={isPressed}
>
  <TrashIcon />
</button>
```

---

## 체크리스트

UI 작업 전 확인:
- [ ] TabComponent/WeaverDataTable 사용 가능한지 확인
- [ ] URL 상태 관리 (필터/검색)
- [ ] 반응형 디자인 (Tailwind breakpoints)
- [ ] 시맨틱 HTML & ARIA

---

## 공통 컴포넌트 위치

```
apps/core/src/system/static/views/components/
  ├── TabComponent.tsx
  ├── WeaverDataTable.tsx
  └── (기타 공통 컴포넌트)
```

새로운 공통 컴포넌트가 필요한 경우, 먼저 기존 컴포넌트를 확인하세요.

---

## 참고

이 규칙은 `/CLAUDE.md`의 UI 규칙을 상세화한 것입니다.
