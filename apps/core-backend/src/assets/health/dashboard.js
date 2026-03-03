// Wait for ApiClient to be available
function waitForApiClient() {
    return new Promise((resolve) => {
        if (typeof window.ApiClient !== 'undefined') {
            resolve();
        } else {
            console.log('ApiClient not ready, waiting...');
            const checkInterval = setInterval(() => {
                if (typeof window.ApiClient !== 'undefined') {
                    console.log('ApiClient is now available');
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 50);
        }
    });
}

// Wait for WeaverCard to be available
function waitForWeaverCard() {
    return new Promise((resolve) => {
        if (typeof window.WeaverCard !== 'undefined') {
            resolve();
        } else {
            console.log('WeaverCard not ready, waiting...');
            const checkInterval = setInterval(() => {
                if (typeof window.WeaverCard !== 'undefined') {
                    console.log('WeaverCard is now available');
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 50);
        }
    });
}

let healthData = null;
let refreshInterval = null;

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting health check');
    // WeaverCard는 fallback으로 처리하므로 바로 시작
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
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Checking...';
    loading.style.display = 'block';
    dashboard.style.display = 'none';
    errorContainer.innerHTML = '';

    try {
        console.log('Fetching health data from /v1/health/');
        // Ensure ApiClient is available
        await waitForApiClient();
        const response = await window.ApiClient.get('/v1/health/');
        console.log('Response status:', response.status);
        
        let data;
        if (response.ok) {
            data = await response.json();
        } else {
            // For error responses, still try to get JSON data
            try {
                data = await response.json();
            } catch {
                data = { message: 'Unknown error', status: 'error' };
            }
        }
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
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        updateTimestamp();
    }
}

// 에러 메시지 표시
function showError(message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = `
        <div class="error-message">
            <strong>⚠️ Health check failed:</strong> ${message}
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
        // 에러 응답 형태: { success: false, error: {...} }
        // 실제 응답에서 details 필드에 헬스체크 데이터가 있음
        if (data.error && data.error.details) {
            healthDetails = data.error.details;
            
            // 개별 서비스 상태를 확인하여 전체 상태 결정
            const services = Object.values(healthDetails);
            const allUp = services.every(service => service.status === 'up');
            const allDown = services.every(service => service.status === 'down');
            
            if (allUp) {
                healthStatus = 'ok';
            } else if (allDown) {
                healthStatus = 'error';
            } else {
                // 부분적 장애 - warning으로 표시
                healthStatus = 'warning';
            }
        } else if (data.error && data.error.info) {
            healthDetails = data.error.info;
            healthStatus = 'error'; // info 필드는 일반적으로 전체 오류
        } else {
            // fallback으로 빈 객체 제공하고 기본 에러 정보 생성
            healthDetails = {
                database: {
                    status: 'down',
                    message: data.error?.message || 'Database connection failed'
                }
            };
            healthStatus = 'error';
        }
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
    let status, statusText, statusIcon;
    
    if (data.status === 'ok') {
        status = 'success';
        statusText = 'Healthy';
        statusIcon = '✅';
    } else if (data.status === 'warning') {
        status = 'warning';
        statusText = 'Partial Outage';
        statusIcon = '⚠️';
    } else {
        status = 'error';
        statusText = 'Error';
        statusIcon = '❌';
    }
    
    const content = `
        <div class="weaver-metric">
            <div class="weaver-metric-label">Status</div>
            <div class="weaver-metric-value">${statusText}</div>
        </div>
        <div class="weaver-metric">
            <div class="weaver-metric-label">Checked At</div>
            <div class="weaver-metric-value">${new Date().toLocaleString('en-US')}</div>
        </div>
    `;
    
    // Fallback 카드 생성 함수 (WeaverCard 없을 때)
    if (window.WeaverCard && window.WeaverCard.createCard) {
        return window.WeaverCard.createCard({
            title: 'Overall System Status',
            content,
            status,
            className: 'overall-status',
            icon: statusIcon
        });
    } else {
        // 간단한 HTML 카드 생성
        const card = document.createElement('div');
        card.className = `weaver-card ${status} overall-status`;
        card.innerHTML = `
            <div class="weaver-card-header">
                <div class="weaver-status-icon ${status}">
                    ${statusIcon}
                </div>
                <h3 class="weaver-card-title">Overall System Status</h3>
            </div>
            <div class="weaver-card-content">
                ${content}
            </div>
        `;
        return card;
    }
}

// 개별 헬스체크 카드 생성 (함수명 변경하여 충돌 방지)
function createHealthStatusCard(key, data) {
    const titles = {
        'database': 'Database',
        'memory_heap': 'Heap Memory',
        'memory_rss': 'RSS Memory',
        'storage': 'Storage'
    };
    const title = titles[key] || key;
    
    // Fallback 카드 생성 함수 (WeaverCard 없을 때)
    if (window.WeaverCard && window.WeaverCard.createHealthCard) {
        return window.WeaverCard.createHealthCard({
            type: key,
            title,
            data
        });
    } else {
        // 간단한 HTML 헬스 카드 생성
        const status = data.status === 'up' ? 'success' : 'error';
        const statusText = data.status === 'up' ? 'Healthy' : 'Error';
        const iconMap = {
            'database': '🗄️',
            'memory_heap': '💾',
            'memory_rss': '📊',
            'storage': '💿'
        };
        const icon = iconMap[key] || '📋';
        
        let metricsHtml = `
            <div class="weaver-metric">
                <div class="weaver-metric-label">Status</div>
                <div class="weaver-metric-value">${statusText}</div>
            </div>
        `;
        
        if (data.message && data.status !== 'up') {
            metricsHtml += `
                <div class="weaver-metric">
                    <div class="weaver-metric-label">Error Message</div>
                    <div class="weaver-metric-value" style="color: var(--status-error, #ef4444);">${data.message}</div>
                </div>
            `;
        }
        
        const card = document.createElement('div');
        card.className = `weaver-card ${status} health-card`;
        card.innerHTML = `
            <div class="weaver-card-header">
                <div class="weaver-status-icon ${status}">
                    ${icon}
                </div>
                <h3 class="weaver-card-title">${title}</h3>
            </div>
            <div class="weaver-card-content">
                ${metricsHtml}
            </div>
        `;
        return card;
    }
}

// 헬스체크 메트릭 렌더링 함수는 공통 컴포넌트로 이동됨

// 헬스체크 타이틀과 아이콘 매핑은 utils/helpers.js에서 import됨

// 타임스탬프 업데이트
function updateTimestamp() {
    const timestamp = document.getElementById('timestamp');
    timestamp.textContent = `Last updated: ${new Date().toLocaleString('en-US')}`;
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