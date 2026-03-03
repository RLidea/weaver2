/**
 * Weaver2 Button Component
 * 재사용 가능한 버튼 컴포넌트
 */

/**
 * 기본 버튼 컴포넌트를 생성합니다
 * @param {Object} props - 버튼 속성
 * @param {string} props.text - 버튼 텍스트
 * @param {string} [props.type] - 버튼 타입 (primary, secondary)
 * @param {string} [props.className] - 추가 CSS 클래스
 * @param {Function} [props.onClick] - 클릭 이벤트 핸들러
 * @param {boolean} [props.disabled] - 비활성화 상태
 * @param {string} [props.icon] - 아이콘 (emoji 또는 문자)
 * @param {string} [props.size] - 크기 (sm, md, lg)
 * @returns {HTMLElement} 버튼 DOM 엘리먼트
 */
export function createButton({ 
  text, 
  type = 'primary', 
  className = '', 
  onClick = null, 
  disabled = false,
  icon = null,
  size = 'md'
}) {
  const button = document.createElement('button');
  button.className = `weaver-button ${type} ${size} ${className}`.trim();
  button.disabled = disabled;
  
  if (onClick) {
    button.addEventListener('click', onClick);
  }
  
  const iconHtml = icon ? `<span class="button-icon">${icon}</span>` : '';
  const textHtml = `<span class="button-text">${text}</span>`;
  
  button.innerHTML = `${iconHtml}${textHtml}`;
  
  return button;
}

/**
 * 주 버튼 컴포넌트를 생성합니다
 * @param {Object} props - 버튼 속성
 * @returns {HTMLElement} 주 버튼 DOM 엘리먼트
 */
export function createPrimaryButton(props) {
  return createButton({
    ...props,
    type: 'primary'
  });
}

/**
 * 보조 버튼 컴포넌트를 생성합니다
 * @param {Object} props - 버튼 속성
 * @returns {HTMLElement} 보조 버튼 DOM 엘리먼트
 */
export function createSecondaryButton(props) {
  return createButton({
    ...props,
    type: 'secondary'
  });
}

/**
 * 새로고침 버튼 컴포넌트를 생성합니다
 * @param {Object} props - 버튼 속성
 * @param {Function} props.onRefresh - 새로고침 이벤트 핸들러
 * @param {boolean} [props.loading] - 로딩 상태
 * @returns {HTMLElement} 새로고침 버튼 DOM 엘리먼트
 */
export function createRefreshButton({ onRefresh, loading = false }) {
  const button = createPrimaryButton({
    text: loading ? '확인 중...' : '새로고침',
    icon: '🔄',
    onClick: onRefresh,
    disabled: loading,
    className: 'refresh-button'
  });
  
  return button;
}

/**
 * 액션 버튼 컴포넌트를 생성합니다 (관리자 페이지용)
 * @param {Object} props - 버튼 속성
 * @param {string} props.text - 버튼 텍스트
 * @param {string} props.icon - 아이콘
 * @param {Function} props.onClick - 클릭 이벤트 핸들러
 * @param {string} [props.variant] - 변형 (primary, success, warning, danger)
 * @returns {HTMLElement} 액션 버튼 DOM 엘리먼트
 */
export function createActionButton({ 
  text, 
  icon, 
  onClick, 
  variant = 'primary' 
}) {
  const button = createButton({
    text,
    icon,
    onClick,
    type: 'secondary',
    className: `action-button ${variant}`
  });
  
  return button;
}