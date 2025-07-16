/**
 * Weaver2 Status Badge Component
 * 상태 배지 컴포넌트
 */

import { getStatusClass } from '../utils/helpers.js';

/**
 * 상태 배지 컴포넌트를 생성합니다
 * @param {Object} props - 배지 속성
 * @param {string} props.text - 배지 텍스트
 * @param {string} props.status - 상태 (success, warning, error, info)
 * @param {string} [props.className] - 추가 CSS 클래스
 * @param {boolean} [props.pulse] - 펄스 애니메이션 여부
 * @returns {HTMLElement} 배지 DOM 엘리먼트
 */
export function createStatusBadge({ 
  text, 
  status, 
  className = '', 
  pulse = false 
}) {
  const badge = document.createElement('div');
  const statusClass = getStatusClass(status);
  
  badge.className = `weaver-status-badge ${statusClass} ${className}`.trim();
  
  if (pulse) {
    badge.style.animation = 'pulse 2s infinite';
  }
  
  badge.textContent = text;
  
  return badge;
}