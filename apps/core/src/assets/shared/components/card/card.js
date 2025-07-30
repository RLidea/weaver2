/**
 * Weaver2 Card Component
 * 재사용 가능한 카드 컴포넌트
 */

// 임시로 helpers import 제거하고 직접 구현
function getStatusClass(status) {
  const classMap = {
    'up': 'success',
    'down': 'error',
    'success': 'success',
    'warning': 'warning',
    'error': 'error',
    'info': 'info'
  };
  return classMap[status] || 'info';
}

function getStatusIcon(type) {
  const iconMap = {
    'database': '🗄️',
    'memory_heap': '💾',
    'memory_rss': '📊',
    'storage': '💿'
  };
  return iconMap[type] || '📋';
}

/**
 * 기본 카드 컴포넌트를 생성합니다
 * @param {Object} props - 카드 속성
 * @param {string} props.title - 카드 제목
 * @param {string} props.content - 카드 내용 (HTML 문자열)
 * @param {string} [props.status] - 상태 (success, warning, error, info)
 * @param {string} [props.className] - 추가 CSS 클래스
 * @param {string} [props.icon] - 아이콘 (emoji 또는 문자)
 * @param {Function} [props.onClick] - 클릭 이벤트 핸들러
 * @returns {HTMLElement} 카드 DOM 엘리먼트
 */
export function createCard({ 
  title, 
  content, 
  status = 'default', 
  className = '', 
  icon = null,
  onClick = null 
}) {
  const card = document.createElement('div');
  card.className = `weaver-card ${status !== 'default' ? status : ''} ${className}`.trim();
  
  if (onClick) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', onClick);
  }
  
  const statusIconHtml = icon ? `
    <div class="weaver-status-icon ${getStatusClass(status)}">
      ${icon}
    </div>
  ` : '';
  
  card.innerHTML = `
    <div class="weaver-card-header">
      ${statusIconHtml}
      <h3 class="weaver-card-title">${title}</h3>
    </div>
    <div class="weaver-card-content">
      ${content}
    </div>
  `;
  
  return card;
}

/**
 * 헬스체크 전용 카드 컴포넌트를 생성합니다
 * @param {Object} props - 카드 속성
 * @param {string} props.type - 헬스체크 타입 (database, memory_heap, memory_rss, storage)
 * @param {string} props.title - 카드 제목
 * @param {Object} props.data - 헬스체크 데이터
 * @param {string} props.data.status - 상태 (up, down)
 * @param {string} [props.data.message] - 오류 메시지
 * @param {number} [props.data.used] - 사용량
 * @param {number} [props.data.limit] - 제한량
 * @param {number} [props.data.available] - 사용가능량
 * @returns {HTMLElement} 헬스 카드 DOM 엘리먼트
 */
export function createHealthCard({ type, title, data }) {
  const status = data.status === 'up' ? 'success' : 'error';
  const icon = getStatusIcon(type);
  
  const metricsHtml = renderHealthMetrics(type, data);
  
  return createCard({
    title,
    content: metricsHtml,
    status,
    className: 'health-card',
    icon
  });
}

/**
 * 관리자 페이지용 카드 컴포넌트를 생성합니다
 * @param {Object} props - 카드 속성
 * @param {string} props.title - 카드 제목
 * @param {string} props.description - 카드 설명
 * @param {string} [props.number] - 숫자 정보
 * @param {string} [props.icon] - 아이콘
 * @param {Function} [props.onClick] - 클릭 이벤트 핸들러
 * @returns {HTMLElement} 관리자 카드 DOM 엘리먼트
 */
export function createAdminCard({ 
  title, 
  description, 
  number = null,
  icon = null,
  onClick = null 
}) {
  const numberHtml = number ? `
    <div class="weaver-metric">
      <div class="weaver-metric-label">Total Count</div>
      <div class="weaver-metric-value" style="font-size: 24px; font-weight: bold;">${number}</div>
    </div>
  ` : '';
  
  const content = `
    <div class="weaver-metric">
      <div class="weaver-metric-label">Description</div>
      <div class="weaver-metric-value">${description}</div>
    </div>
    ${numberHtml}
  `;
  
  return createCard({
    title,
    content,
    status: 'info',
    className: 'admin-card',
    icon,
    onClick
  });
}

/**
 * 헬스체크 메트릭을 렌더링합니다
 * @param {string} key - 헬스체크 타입
 * @param {Object} data - 헬스체크 데이터
 * @returns {string} 메트릭 HTML 문자열
 */
function renderHealthMetrics(key, data) {
  let metricsHtml = `
    <div class="weaver-metric">
      <div class="weaver-metric-label">Status</div>
      <div class="weaver-metric-value">${data.status === 'up' ? 'Healthy' : 'Error'}</div>
    </div>
  `;

  if (key === 'database') {
    metricsHtml += `
      <div class="weaver-metric">
        <div class="weaver-metric-label">Connection</div>
        <div class="weaver-metric-value">${data.status === 'up' ? 'Connected' : 'Connection Failed'}</div>
      </div>
    `;
  } else if (key.includes('memory')) {
    if (data.used && data.limit) {
      const usedMB = Math.round(data.used / 1024 / 1024);
      const limitMB = Math.round(data.limit / 1024 / 1024);
      const percentage = Math.round((data.used / data.limit) * 100);
      
      metricsHtml += `
        <div class="weaver-metric">
          <div class="weaver-metric-label">Usage</div>
          <div class="weaver-metric-value">${usedMB}MB / ${limitMB}MB (${percentage}%)</div>
        </div>
        <div class="weaver-progress-meter">
          <div class="weaver-progress-fill ${percentage > 80 ? 'error' : percentage > 60 ? 'warning' : 'success'}" 
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
        <div class="weaver-metric">
          <div class="weaver-metric-label">Usage</div>
          <div class="weaver-metric-value">${usedGB}GB / ${totalGB}GB (${percentage}%)</div>
        </div>
        <div class="weaver-progress-meter">
          <div class="weaver-progress-fill ${percentage > 90 ? 'error' : percentage > 70 ? 'warning' : 'success'}" 
               style="width: ${percentage}%"></div>
        </div>
      `;
    }
  }

  if (data.message && data.status !== 'up') {
    metricsHtml += `
      <div class="weaver-metric">
        <div class="weaver-metric-label">Error Message</div>
        <div class="weaver-metric-value" style="color: var(--status-error);">${data.message}</div>
      </div>
    `;
  }

  return metricsHtml;
}

// Make functions globally available for non-module scripts
window.WeaverCard = {
    createCard,
    createHealthCard,
    createAdminCard
};