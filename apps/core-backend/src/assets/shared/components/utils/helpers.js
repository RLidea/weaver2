/**
 * Weaver2 Utility Functions
 * 컴포넌트에서 사용하는 유틸리티 함수들
 */

/**
 * 상태에 따른 CSS 클래스를 반환합니다
 * @param {string} status - 상태 (up, down, success, warning, error, info)
 * @returns {string} CSS 클래스
 */
export function getStatusClass(status) {
  const classMap = {
    'up': 'success',
    'down': 'error',
    'success': 'success',
    'warning': 'warning',
    'error': 'error',
    'info': 'info',
    'healthy': 'success',
    'unhealthy': 'error'
  };
  
  return classMap[status] || 'info';
}

/**
 * 헬스체크 타입에 따른 아이콘을 반환합니다
 * @param {string} type - 헬스체크 타입
 * @returns {string} 아이콘 (emoji)
 */
export function getStatusIcon(type) {
  const iconMap = {
    'database': '🗄️',
    'memory_heap': '💾',
    'memory_rss': '📊',
    'storage': '💿',
    'network': '🌐',
    'cpu': '⚡',
    'api': '🔗',
    'cache': '🗂️',
    'queue': '📋',
    'health': '🏥',
    'system': '⚙️'
  };
  
  return iconMap[type] || '📋';
}

/**
 * 관리자 카드 타입에 따른 아이콘을 반환합니다
 * @param {string} type - 카드 타입
 * @returns {string} 아이콘 (emoji)
 */
export function getAdminIcon(type) {
  const iconMap = {
    'users': '👥',
    'search': '🔍',
    'settings': '⚙️',
    'analytics': '📊',
    'content': '📝',
    'notifications': '🔔',
    'security': '🔒',
    'system': '💻'
  };
  
  return iconMap[type] || '📋';
}

/**
 * 바이트를 읽기 쉬운 형태로 포맷합니다
 * @param {number} bytes - 바이트 수
 * @param {number} [decimals] - 소수점 자리수
 * @returns {string} 포맷된 문자열
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 퍼센트를 포맷합니다
 * @param {number} value - 값
 * @param {number} total - 전체 값
 * @param {number} [decimals] - 소수점 자리수
 * @returns {string} 포맷된 퍼센트 문자열
 */
export function formatPercentage(value, total, decimals = 1) {
  if (total === 0) return '0%';
  
  const percentage = (value / total) * 100;
  return percentage.toFixed(decimals) + '%';
}

/**
 * 숫자를 읽기 쉬운 형태로 포맷합니다
 * @param {number} num - 숫자
 * @returns {string} 포맷된 문자열
 */
export function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  } else {
    return num.toString();
  }
}

/**
 * 시간을 상대적인 형태로 포맷합니다
 * @param {Date} date - 날짜
 * @returns {string} 상대적 시간 문자열
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}일 전`;
  } else if (hours > 0) {
    return `${hours}시간 전`;
  } else if (minutes > 0) {
    return `${minutes}분 전`;
  } else {
    return `${seconds}초 전`;
  }
}

/**
 * 상태에 따른 메시지를 반환합니다
 * @param {string} status - 상태
 * @param {string} type - 타입
 * @returns {string} 상태 메시지
 */
export function getStatusMessage(status, type = 'system') {
  const messages = {
    success: {
      system: '정상 작동 중',
      database: '데이터베이스 연결 정상',
      memory: '메모리 사용량 정상',
      storage: '저장 공간 충분',
      network: '네트워크 연결 정상'
    },
    warning: {
      system: '주의 필요',
      database: '데이터베이스 응답 느림',
      memory: '메모리 사용량 높음',
      storage: '저장 공간 부족',
      network: '네트워크 지연'
    },
    error: {
      system: '오류 발생',
      database: '데이터베이스 연결 실패',
      memory: '메모리 부족',
      storage: '저장 공간 부족',
      network: '네트워크 연결 실패'
    }
  };
  
  return messages[status]?.[type] || messages[status]?.system || '상태 불명';
}

/**
 * 색상 값을 반환합니다 (CSS 변수 또는 hex)
 * @param {string} colorName - 색상 이름
 * @returns {string} 색상 값
 */
export function getColor(colorName) {
  const colors = {
    'success': 'var(--status-success)',
    'warning': 'var(--status-warning)',
    'error': 'var(--status-error)',
    'info': 'var(--status-info)',
    'primary': 'var(--primary-blue)',
    'secondary': 'var(--secondary-blue)',
    'text-primary': 'var(--text-primary)',
    'text-secondary': 'var(--text-secondary)',
    'text-muted': 'var(--text-muted)'
  };
  
  return colors[colorName] || colorName;
}

/**
 * 깊은 복사를 수행합니다
 * @param {*} obj - 복사할 객체
 * @returns {*} 복사된 객체
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
}

/**
 * 디바운스 함수를 생성합니다
 * @param {Function} func - 실행할 함수
 * @param {number} wait - 대기 시간 (밀리초)
 * @returns {Function} 디바운스된 함수
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}