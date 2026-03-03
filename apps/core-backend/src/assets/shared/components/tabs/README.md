# Tab Component with URL State Management

탭 컴포넌트가 URL query string을 통해 탭 상태를 유지하는 기능을 제공합니다.

## 기본 사용법

### HTML
```html
<!-- URL State Manager 먼저 로드 -->
<script src="/shared/utils/url-state.js"></script>
<script src="/shared/components/tabs/tabs.js"></script>
```

### JavaScript
```javascript
// 기본 탭 설정
const tabs = [
    {
        id: 'overview',
        label: 'Overview',
        icon: 'fas fa-chart-line',
        content: ''
    },
    {
        id: 'details',
        label: 'Details', 
        icon: 'fas fa-list',
        content: ''
    }
];

// URL 상태 유지 기능과 함께 탭 생성
const tabComponent = TabComponent.create('tab-container', tabs, {
    activeTab: 'overview',           // 기본 활성 탭
    onTabChange: handleTabChange,    // 탭 변경 시 콜백
    urlStateKey: 'tab',             // URL 파라미터 키 (예: ?tab=overview)
    urlStateEnabled: true           // URL 상태 관리 활성화 (기본값: true)
});

function handleTabChange(tabId) {
    console.log('Active tab:', tabId);
    // 탭별 데이터 로딩 등 처리
}

// 초기 데이터 로딩 시 URL 상태 고려
loadTabData(tabComponent.getActiveTab());
```

## URL State Manager 기능

### 단일 파라미터 관리
```javascript
// 파라미터 설정
URLStateManager.setParam('tab', 'overview');

// 파라미터 조회
const currentTab = URLStateManager.getParam('tab', 'overview');

// 파라미터 제거
URLStateManager.removeParam('tab');
```

### 다중 파라미터 관리
```javascript
// 여러 파라미터 한번에 설정
URLStateManager.setParams({
    tab: 'overview',
    filter: 'active',
    page: '1'
});

// 여러 파라미터 조회
const params = URLStateManager.getParams(['tab', 'filter', 'page']);
console.log(params); // { tab: 'overview', filter: 'active', page: '1' }
```

### 브라우저 뒤로가기/앞으로가기 지원
```javascript
// URL 상태 변화 감지
URLStateManager.onStateChange(() => {
    const newTab = URLStateManager.getParam('tab');
    if (newTab) {
        tabComponent.setActiveTab(newTab);
    }
});
```

## 옵션 설명

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `urlStateKey` | string | null | URL 파라미터 키 이름 |
| `urlStateEnabled` | boolean | true | URL 상태 관리 활성화 여부 |
| `activeTab` | string | 첫번째 탭 | 기본 활성 탭 ID |
| `onTabChange` | function | null | 탭 변경 시 콜백 함수 |

## 실제 사용 예제

### Security 페이지
```javascript
securityTabComponent = TabComponent.create('security-tabs-container', securityTabs, {
    activeTab: 'policies',
    onTabChange: handleTabChange,
    urlStateKey: 'tab',           // URL: /admin/security?tab=policies
    urlStateEnabled: true
});
```

### Analytics 페이지  
```javascript
tabComponent = TabComponent.create('analytics-tabs-container', tabs, {
    activeTab: 'overview',
    onTabChange: loadTabData,
    urlStateKey: 'tab',           // URL: /admin/analytics?tab=overview
    urlStateEnabled: true
});
```

## 이점

1. **사용자 경험 향상**: 페이지 새로고침 후에도 선택한 탭 유지
2. **URL 공유 가능**: 특정 탭 상태의 URL을 다른 사람과 공유 가능  
3. **브라우저 뒤로가기 지원**: 브라우저 네비게이션과 자연스럽게 연동
4. **코드 재사용성**: 모든 탭 컴포넌트에서 동일한 방식으로 사용 가능