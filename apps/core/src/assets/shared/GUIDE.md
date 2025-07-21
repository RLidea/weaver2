# Weaver2 Shared Component System Guide

이 문서는 Weaver2 프로젝트의 공유 컴포넌트 시스템에 대한 가이드입니다.

## 📁 디렉토리 구조

```
apps/core/src/public/shared/
├── GUIDE.md                      # 이 문서
├── styles/
│   ├── design-system.css         # 디자인 시스템 변수 및 기본 스타일
│   └── components.css            # 공통 컴포넌트 스타일
└── components/
    ├── index.js                  # 컴포넌트 내보내기
    ├── card/
    │   └── card.js              # 카드 컴포넌트
    ├── button/
    │   └── button.js            # 버튼 컴포넌트
    ├── status-badge/
    │   └── status-badge.js      # 상태 배지 컴포넌트
    ├── progress-meter/
    │   └── progress-meter.js    # 진행률 미터 컴포넌트
    ├── loading-spinner/
    │   └── loading-spinner.js   # 로딩 스피너 컴포넌트
    ├── data-table/
    │   ├── data-table.html      # 데이터 테이블 템플릿
    │   ├── data-table.css       # 데이터 테이블 스타일
    │   └── data-table.js        # 데이터 테이블 컴포넌트
    ├── modal/
    │   ├── user-detail-modal.css # 사용자 상세 모달 스타일
    │   └── user-detail-modal.js  # 사용자 상세 모달 컴포넌트
    └── utils/
        └── helpers.js           # 유틸리티 함수
```

## 🎨 디자인 시스템

### CSS 변수 구조
`design-system.css`에서 정의된 CSS 변수들:

```css
:root {
  /* 색상 */
  --primary-blue: #1e40af;
  --secondary-blue: #3b82f6;
  --success-green: #10b981;
  --warning-orange: #f59e0b;
  --error-red: #ef4444;
  
  /* 배경 */
  --glass-bg: rgba(255, 255, 255, 0.12);
  --glass-bg-hover: rgba(255, 255, 255, 0.18);
  
  /* 간격 */
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-md: 16px;
  --spacing-lg: 20px;
  --spacing-xl: 24px;
  --spacing-2xl: 30px;
  --spacing-3xl: 40px;
  
  /* 기타 */
  --border-radius: 16px;
  --transition: all 0.3s ease;
  --blur-amount: blur(30px);
}
```

### Glassmorphism 스타일
- 반투명 배경 (`rgba(255, 255, 255, 0.12)`)
- 백드롭 필터 블러 효과
- 미묘한 그림자와 테두리
- 부드러운 전환 효과

## 🧩 컴포넌트 사용법

### 1. 카드 컴포넌트 (Card)

```javascript
import { createCard, createHealthCard, createAdminCard } from '/health/shared/components/card/card.js';

// 기본 카드
const card = createCard({
  title: '카드 제목',
  content: '<p>카드 내용</p>',
  status: 'success', // success, warning, error, info
  className: 'custom-class',
  icon: '✅',
  onClick: () => console.log('클릭됨')
});

// 헬스체크 카드
const healthCard = createHealthCard({
  type: 'database',
  title: '데이터베이스',
  data: {
    status: 'up',
    used: 1024,
    limit: 2048
  }
});

// 관리자 카드
const adminCard = createAdminCard({
  title: '사용자 관리',
  description: '사용자 계정을 관리합니다',
  number: '1,234',
  icon: '👥',
  onClick: () => window.location.href = '/admin/users'
});
```

### 2. 버튼 컴포넌트 (Button)

```javascript
import { createButton } from '/health/shared/components/button/button.js';

const button = createButton({
  text: '버튼 텍스트',
  type: 'primary', // primary, secondary
  onClick: () => console.log('클릭됨'),
  disabled: false,
  className: 'custom-button'
});
```

### 3. 상태 배지 (Status Badge)

```javascript
import { createStatusBadge } from '/health/shared/components/status-badge/status-badge.js';

const badge = createStatusBadge({
  text: 'System Monitor',
  status: 'info' // success, warning, error, info
});
```

### 4. 데이터 테이블 (Data Table) ⭐ **NEW**

고급 기능을 갖춘 재사용 가능한 데이터 테이블 컴포넌트입니다.

```javascript
// 기본 사용법
const userTable = new WeaverDataTable({
  container: document.getElementById('table-container'),
  data: userData,
  columns: [
    {
      key: 'user',
      label: 'User',
      type: 'user',
      sortable: true
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true
    },
    {
      key: 'role',
      label: 'Role',
      type: 'role',
      sortable: true,
      filterable: true
    },
    {
      key: 'status',
      label: 'Status',
      type: 'status',
      sortable: true,
      filterable: true
    },
    {
      key: 'actions',
      label: 'Actions',
      type: 'actions',
      sortable: false
    }
  ],
  title: 'User Management',
  searchable: true,
  sortable: true,
  filterable: true,
  pagination: true,
  perPageOptions: [10, 25, 50, 100],
  defaultPerPage: 10,
  showAddButton: true,
  addButtonText: 'Add New User',
  onAdd: () => handleAddUser(),
  onEdit: (user) => handleEditUser(user),
  onDelete: (user) => handleDeleteUser(user),
  onView: (user) => handleViewUser(user)
});
```

#### 주요 기능
- **🔍 실시간 검색**: 300ms debounce로 최적화된 검색
- **📊 컬럼 정렬**: 클릭으로 오름차순/내림차순 정렬
- **🔽 필터링**: 역할, 상태별 필터링 + 초기화
- **📄 페이지네이션**: 설정 가능한 페이지당 아이템 수
- **⚡ 액션 버튼**: 보기/수정/삭제 버튼
- **📱 반응형**: 모바일 친화적 디자인
- **🎨 Admin 테마**: 글래스모피즘 스타일 적용

#### 컬럼 타입
- `user`: 사용자 정보 (아바타 + 이름 + 사용자명)
- `status`: 상태 배지 (active/inactive/suspended)
- `role`: 역할 배지
- `date`: 날짜 포맷팅
- `actions`: 액션 버튼들
- 기본: 일반 텍스트

#### 사용 사례
```javascript
// Admin 사용자 관리
const container = document.getElementById('user-data-table-container');
const userTable = new WeaverDataTable({
  container: container,
  data: sampleUsers,
  columns: userColumns,
  title: 'User Management',
  onEdit: (user) => openEditModal(user),
  onDelete: (user) => confirmDelete(user)
});

// 동적 데이터 업데이트
userTable.setData(newUserData);
userTable.setLoading(true);
userTable.refresh();
```

### 5. 사용자 상세 모달 (User Detail Modal) ⭐ **NEW**

사용자 정보를 상세하게 보여주는 모달 컴포넌트입니다.

```javascript
// 기본 사용법
import '/shared/components/modal/user-detail-modal.js';

// 모달 표시
UserDetailModal.show(userData, {
  onClose: () => {
    console.log('모달이 닫혔습니다');
  }
});

// 또는 인스턴스 생성
const modal = new UserDetailModal();
modal.create(userData, {
  onClose: () => handleModalClose()
});
```

#### 주요 기능
- **👤 사용자 프로필**: 아바타, 이름, 사용자명 표시
- **📊 상태 정보**: 역할, 상태 배지로 시각화
- **📝 상세 정보**: 이메일, 생성일, 마지막 로그인 등
- **🎬 부드러운 애니메이션**: 모달 열기/닫기 애니메이션
- **🔒 접근성**: ESC 키, 오버레이 클릭으로 닫기
- **⚡ 액션 버튼**: 편집 기능 연결
- **📱 반응형**: 모바일 최적화

#### 데이터 구조
```javascript
const userData = {
  id: 1,
  username: 'johndoe',
  displayName: 'John Doe',
  email: 'john@example.com',
  role: 'admin',
  status: 'active', // active, inactive
  createdAt: '2024-01-15T10:30:00Z',
  lastLoginAt: '2024-03-15T14:22:00Z',
  profileImageUrl: 'optional-image-url.jpg'
};
```

#### 통합 사용 예시
```javascript
// admin-user-management.js에서 사용
function handleViewUser(user) {
  UserDetailModal.show(user, {
    onClose: () => {
      console.log('User detail modal closed');
    }
  });
}

// DataTable과 연결
const userTable = new WeaverDataTable({
  // ... 기타 설정
  onView: function(user) {
    handleViewUser(user);
  }
});
```

#### 스타일 특징
- **🎨 Glassmorphism**: 기존 디자인 시스템과 일관성 유지
- **🌫️ 자연스러운 배경**: 주변은 그대로, 모달 뒤만 블러 처리
- **✨ 외부 그림자**: 깔끔한 드롭 샤도우로 깊이감 표현
- **🎭 호버 효과**: 버튼과 카드에 미묘한 상호작용

## 🔧 새 컴포넌트 추가하기

### 1. 컴포넌트 파일 생성
```bash
mkdir apps/core/src/public/shared/components/my-component
touch apps/core/src/public/shared/components/my-component/my-component.js
```

### 2. 컴포넌트 구현
```javascript
// my-component.js
export function createMyComponent({ title, content, onClick }) {
  const element = document.createElement('div');
  element.className = 'weaver-my-component';
  
  element.innerHTML = `
    <h3>${title}</h3>
    <div>${content}</div>
  `;
  
  if (onClick) {
    element.addEventListener('click', onClick);
  }
  
  return element;
}
```

### 3. 스타일 추가
`components.css`에 스타일을 추가:
```css
.weaver-my-component {
  background: var(--glass-bg);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  /* ... */
}
```

### 4. 내보내기 추가
`components/index.js`에 추가:
```javascript
export { createMyComponent } from './my-component/my-component.js';
```

## 📊 상태 시스템

컴포넌트들은 일관된 상태 시스템을 사용합니다:

- **success**: 성공/정상 상태 (녹색)
- **warning**: 경고 상태 (주황색)  
- **error**: 오류 상태 (빨간색)
- **info**: 정보 상태 (파란색)

## 🛠️ 네이밍 규칙

### CSS 클래스
- 모든 컴포넌트 클래스는 `weaver-` 접두사 사용
- 예: `weaver-card`, `weaver-button`, `weaver-status-badge`

### JavaScript 함수
- 컴포넌트 생성 함수는 `create` 접두사 사용
- 예: `createCard()`, `createButton()`, `createStatusBadge()`

### 파일명
- 컴포넌트 파일은 케밥 케이스 사용
- 예: `card.js`, `status-badge.js`, `loading-spinner.js`

## 🔄 진화 경로

현재 모듈 패턴으로 구현되어 있으며, 필요시 Web Components로 마이그레이션 가능:

### 현재 (ES6 모듈)
```javascript
import { createCard } from '/health/shared/components/card/card.js';
const card = createCard({ title: 'Test' });
```

### 미래 (Web Components)
```javascript
// 가능한 진화 방향
<weaver-card title="Test"></weaver-card>
```

## 🎯 사용 예시

### 헬스 대시보드
```javascript
import { createHealthCard, createCard } from '/health/shared/components/card/card.js';

// 전체 상태 카드
const overallCard = createCard({
  title: '전체 시스템 상태',
  content: statusHtml,
  status: 'success',
  className: 'overall-status',
  icon: '✅'
});

// 개별 헬스체크 카드
const dbCard = createHealthCard({
  type: 'database',
  title: '데이터베이스',
  data: { status: 'up' }
});
```

### 관리자 대시보드
```javascript
import { createAdminCard } from '/health/shared/components/card/card.js';

const userCard = createAdminCard({
  title: '사용자 관리',
  description: 'Manage registered users',
  number: '1,234',
  icon: '👥'
});
```

### 데이터 테이블 (User Management)
```javascript
// 사용자 관리 페이지에서 사용
const container = document.getElementById('user-data-table-container');
const userTable = new WeaverDataTable({
  container: container,
  data: sampleUsers, // 50명의 샘플 데이터
  columns: userColumns, // 사용자 컬럼 정의
  title: 'User Management',
  searchable: true,
  filterable: true,
  pagination: true,
  defaultPerPage: 10,
  onEdit: handleEditUser,
  onDelete: handleDeleteUser,
  onView: handleViewUser
});
```

## 📝 유지보수 가이드

### 1. 스타일 수정
- 디자인 시스템 변수 변경: `styles/design-system.css`
- 컴포넌트 스타일 변경: `styles/components.css`

### 2. 컴포넌트 업데이트
- 기존 컴포넌트 수정 시 하위 호환성 고려
- 새 속성 추가 시 기본값 설정

### 3. 서빙 엔드포인트
`static.controller.ts`에서 정의된 엔드포인트:
- `/static/shared/styles/:file` - 스타일 파일
- `/static/shared/components/:component/:file` - 컴포넌트 파일

### 4. 데이터 테이블 업데이트
- **HTML 템플릿 수정**: `data-table/data-table.html`
- **스타일 수정**: `data-table/data-table.css`
- **기능 추가/수정**: `data-table/data-table.js`
- **새 컬럼 타입 추가**: `renderCell()` 메서드에 case 추가

```javascript
// 새 컬럼 타입 추가 예시
case 'custom-type':
  return this.renderCustomType(value);
```

---

이 가이드는 Weaver2 프로젝트의 공유 컴포넌트 시스템을 효과적으로 사용하고 확장하는 데 도움이 됩니다.
