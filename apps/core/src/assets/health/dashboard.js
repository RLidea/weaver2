// 개별 컴포넌트 import
import { createHealthCard, createCard } from '/static/shared/components/card/card.js';

let healthData = null;
let refreshInterval = null;

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting health check');
    refreshHealth();
    startAutoRefresh();
});

// 자동 새로고침 시작
function startAutoRefresh() {
    refreshInterval = setInterval(refreshHealth, 30000); // 30초마다 새로고침
}

// 자동 새로고침 중지
function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// 헬스체크 데이터 가져오기
async function refreshHealth() {
    console.log('refreshHealth called');
    const refreshBtn = document.getElementById('refresh-btn');
    const loading = document.getElementById('loading');
    const dashboard = document.getElementById('dashboard');
    const errorContainer = document.getElementById('error-container');
    
    refreshBtn.disabled = true;
    refreshBtn.textContent = '🔄 확인 중...';
    loading.style.display = 'block';
    dashboard.style.display = 'none';
    errorContainer.innerHTML = '';

    try {
        console.log('Fetching health data from /v1/health/');
        const response = await fetch('/v1/health/');
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Health data received:', data);
        
        if (response.ok || response.status === 503) {
            healthData = data;
            renderDashboard(data);
            loading.style.display = 'none';
            dashboard.style.display = 'grid';
        } else {
            throw new Error(`HTTP ${response.status}: ${data.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Health check failed:', error);
        showError(error.message);
        loading.style.display = 'none';
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '🔄 새로고침';
        updateTimestamp();
    }
}

// 에러 메시지 표시
function showError(message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = `
        <div class="error-message">
            <strong>⚠️ 헬스체크 실패:</strong> ${message}
        </div>
    `;
}

// 대시보드 렌더링
function renderDashboard(data) {
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = '';

    // 응답 형태에 따라 데이터 파싱
    let healthStatus, healthDetails;
    
    if (data.data) {
        // 성공 응답 형태: { message: "success", data: { status: "ok", details: {...} } }
        const healthData = data.data;
        healthStatus = healthData.status || 'unknown';
        healthDetails = healthData.details || {};
    } else if (data.success !== undefined) {
        // 에러 응답 형태
        healthStatus = data.success ? 'ok' : 'error';
        healthDetails = data.info || data.details || {};
    } else {
        // 직접 응답 형태
        healthStatus = data.status || 'unknown';
        healthDetails = data.details || {};
    }

    console.log('Parsed health status:', healthStatus);
    console.log('Parsed health details:', healthDetails);

    // 전체 상태 카드
    const overallCard = createOverallStatusCard({ status: healthStatus, details: healthDetails });
    dashboard.appendChild(overallCard);

    // 개별 헬스체크 결과 카드들
    if (healthDetails) {
        Object.entries(healthDetails).forEach(([key, value]) => {
            const card = createHealthStatusCard(key, value);
            dashboard.appendChild(card);
        });
    }
}

// 전체 상태 카드 생성
function createOverallStatusCard(data) {
    const status = data.status === 'ok' ? 'success' : 'error';
    const statusText = data.status === 'ok' ? '정상' : '오류';
    const statusIcon = data.status === 'ok' ? '✅' : '❌';
    
    const content = `
        <div class="weaver-metric">
            <div class="weaver-metric-label">상태</div>
            <div class="weaver-metric-value">${statusText}</div>
        </div>
        <div class="weaver-metric">
            <div class="weaver-metric-label">확인 시간</div>
            <div class="weaver-metric-value">${new Date().toLocaleString('ko-KR')}</div>
        </div>
    `;
    
    return createCard({
        title: '전체 시스템 상태',
        content,
        status,
        className: 'overall-status',
        icon: statusIcon
    });
}

// 개별 헬스체크 카드 생성 (함수명 변경하여 충돌 방지)
function createHealthStatusCard(key, data) {
    const titles = {
        'database': '데이터베이스',
        'memory_heap': '힙 메모리',
        'memory_rss': 'RSS 메모리',
        'storage': '스토리지'
    };
    const title = titles[key] || key;
    
    return createHealthCard({
        type: key,
        title,
        data
    });
}

// 헬스체크 메트릭 렌더링 함수는 공통 컴포넌트로 이동됨

// 헬스체크 타이틀과 아이콘 매핑은 utils/helpers.js에서 import됨

// 타임스탬프 업데이트
function updateTimestamp() {
    const timestamp = document.getElementById('timestamp');
    timestamp.textContent = `마지막 업데이트: ${new Date().toLocaleString('ko-KR')}`;
}

// 페이지 언로드 시 자동 새로고침 중지
window.addEventListener('beforeunload', function() {
    stopAutoRefresh();
});

// 키보드 단축키 (F5 또는 Ctrl+R)
document.addEventListener('keydown', function(e) {
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
        refreshHealth();
    }
});

// 새로고침 버튼 클릭 이벤트
document.addEventListener('DOMContentLoaded', function() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshHealth);
    }
});