/**
 * Weaver2 Loading Spinner Component
 * 로딩 스피너 컴포넌트
 */

/**
 * 로딩 스피너 컴포넌트를 생성합니다
 * @param {Object} props - 스피너 속성
 * @param {string} [props.size] - 크기 (sm, md, lg)
 * @param {string} [props.className] - 추가 CSS 클래스
 * @param {string} [props.text] - 로딩 텍스트
 * @returns {HTMLElement} 로딩 스피너 DOM 엘리먼트
 */
export function createLoadingSpinner({ 
  size = 'md', 
  className = '', 
  text = null 
}) {
  const container = document.createElement('div');
  container.className = `loading-spinner-container ${size} ${className}`.trim();
  
  const spinner = document.createElement('div');
  spinner.className = `weaver-loading-spinner ${size}`;
  
  container.appendChild(spinner);
  
  if (text) {
    const textElement = document.createElement('div');
    textElement.className = 'loading-text';
    textElement.textContent = text;
    container.appendChild(textElement);
  }
  
  return container;
}

/**
 * 전체 화면 로딩 오버레이를 생성합니다
 * @param {Object} props - 오버레이 속성
 * @param {string} [props.text] - 로딩 텍스트
 * @param {Function} [props.onCancel] - 취소 콜백
 * @returns {HTMLElement} 로딩 오버레이 DOM 엘리먼트
 */
export function createLoadingOverlay({ 
  text = '로딩 중...', 
  onCancel = null 
}) {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;
  
  const spinner = createLoadingSpinner({ 
    size: 'lg', 
    text 
  });
  
  overlay.appendChild(spinner);
  
  if (onCancel) {
    const cancelButton = document.createElement('button');
    cancelButton.className = 'weaver-button secondary';
    cancelButton.textContent = '취소';
    cancelButton.style.marginTop = '20px';
    cancelButton.addEventListener('click', onCancel);
    overlay.appendChild(cancelButton);
  }
  
  return overlay;
}

/**
 * 로딩 오버레이를 표시합니다
 * @param {string} [text] - 로딩 텍스트
 * @param {Function} [onCancel] - 취소 콜백
 * @returns {Function} 오버레이 제거 함수
 */
export function showLoadingOverlay(text = '로딩 중...', onCancel = null) {
  const overlay = createLoadingOverlay({ text, onCancel });
  document.body.appendChild(overlay);
  
  return () => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  };
}

/**
 * 인라인 로딩 스피너를 생성합니다
 * @param {Object} props - 스피너 속성
 * @param {string} [props.text] - 로딩 텍스트
 * @returns {HTMLElement} 인라인 로딩 스피너 DOM 엘리먼트
 */
export function createInlineSpinner({ text = '로딩 중...' }) {
  const container = document.createElement('div');
  container.className = 'inline-loading';
  container.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px;
    text-align: center;
    color: var(--text-secondary);
  `;
  
  const spinner = document.createElement('div');
  spinner.className = 'weaver-loading-spinner sm';
  
  const textElement = document.createElement('span');
  textElement.textContent = text;
  
  container.appendChild(spinner);
  container.appendChild(textElement);
  
  return container;
}