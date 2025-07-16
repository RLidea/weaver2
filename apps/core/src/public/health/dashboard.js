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
        console.log('Fetching health data from /health/');
        const response = await fetch('/health/');
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
            const card = createHealthCard(key, value);
            dashboard.appendChild(card);
        });
    }
}

// 전체 상태 카드 생성
function createOverallStatusCard(data) {
    const card = document.createElement('div');
    card.className = 'card overall-status';
    
    const statusClass = data.status === 'ok' ? 'status-healthy' : 'status-error';
    const statusText = data.status === 'ok' ? '정상' : '오류';
    const statusIcon = data.status === 'ok' ? '✅' : '❌';
    
    // 카드 상태 클래스 추가
    if (data.status === 'ok') {
        card.classList.add('healthy');
    } else {
        card.classList.add('error');
    }
    
    card.innerHTML = `
        <div class="card-header">
            <div class="status-icon ${statusClass}">${statusIcon}</div>
            <h3>전체 시스템 상태</h3>
        </div>
        <div class="metric">
            <div class="metric-label">상태</div>
            <div class="metric-value">${statusText}</div>
        </div>
        <div class="metric">
            <div class="metric-label">확인 시간</div>
            <div class="metric-value">${new Date().toLocaleString('ko-KR')}</div>
        </div>
    `;
    
    return card;
}

// 개별 헬스체크 카드 생성
function createHealthCard(key, data) {
    const card = document.createElement('div');
    card.className = 'card';
    
    const statusClass = data.status === 'up' ? 'status-healthy' : 'status-error';
    const title = getHealthTitle(key);
    const icon = getHealthIcon(key);
    
    // 카드 상태 클래스 추가
    if (data.status === 'up') {
        card.classList.add('healthy');
    } else {
        card.classList.add('error');
    }
    
    card.innerHTML = `
        <div class="card-header">
            <div class="status-icon ${statusClass}">${icon}</div>
            <h3>${title}</h3>
        </div>
        ${renderHealthMetrics(key, data)}
    `;
    
    return card;
}

// 헬스체크 메트릭 렌더링
function renderHealthMetrics(key, data) {
    let metricsHtml = `
        <div class="metric">
            <div class="metric-label">상태</div>
            <div class="metric-value">${data.status === 'up' ? '정상' : '오류'}</div>
        </div>
    `;

    if (key === 'database') {
        metricsHtml += `
            <div class="metric">
                <div class="metric-label">연결 상태</div>
                <div class="metric-value">${data.status === 'up' ? '연결됨' : '연결 실패'}</div>
            </div>
        `;
    } else if (key.includes('memory')) {
        if (data.used && data.limit) {
            const usedMB = Math.round(data.used / 1024 / 1024);
            const limitMB = Math.round(data.limit / 1024 / 1024);
            const percentage = Math.round((data.used / data.limit) * 100);
            
            metricsHtml += `
                <div class="metric">
                    <div class="metric-label">사용량</div>
                    <div class="metric-value">${usedMB}MB / ${limitMB}MB (${percentage}%)</div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${percentage > 80 ? 'error' : percentage > 60 ? 'warning' : ''}" 
                         style="width: ${percentage}%"></div>
                </div>
            `;
        }
    } else if (key === 'storage') {
        if (data.used && data.available) {
            const usedGB = Math.round(data.used / 1024 / 1024 / 1024);
            const availableGB = Math.round(data.available / 1024 / 1024 / 1024);
            const totalGB = usedGB + availableGB;
            const percentage = Math.round((data.used / (data.used + data.available)) * 100);
            
            metricsHtml += `
                <div class="metric">
                    <div class="metric-label">사용량</div>
                    <div class="metric-value">${usedGB}GB / ${totalGB}GB (${percentage}%)</div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${percentage > 90 ? 'error' : percentage > 70 ? 'warning' : ''}" 
                         style="width: ${percentage}%"></div>
                </div>
            `;
        }
    }

    if (data.message && data.status !== 'up') {
        metricsHtml += `
            <div class="metric">
                <div class="metric-label">오류 메시지</div>
                <div class="metric-value" style="color: #f44336;">${data.message}</div>
            </div>
        `;
    }

    return metricsHtml;
}

// 헬스체크 타이틀 매핑
function getHealthTitle(key) {
    const titles = {
        'database': '데이터베이스',
        'memory_heap': '힙 메모리',
        'memory_rss': 'RSS 메모리',
        'storage': '스토리지'
    };
    return titles[key] || key;
}

// 헬스체크 아이콘 매핑
function getHealthIcon(key) {
    const icons = {
        'database': '🗄️',
        'memory_heap': '💾',
        'memory_rss': '📊',
        'storage': '💿'
    };
    return icons[key] || '📋';
}

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