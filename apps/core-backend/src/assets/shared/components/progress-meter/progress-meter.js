/**
 * Weaver2 Progress Meter Component
 * 프로그레스 미터 컴포넌트
 */

import { getStatusClass, formatPercentage } from '../utils/helpers.js';

/**
 * 프로그레스 미터 컴포넌트를 생성합니다
 * @param {Object} props - 프로그레스 미터 속성
 * @param {number} props.value - 현재 값
 * @param {number} props.max - 최대 값
 * @param {string} [props.className] - 추가 CSS 클래스
 * @param {boolean} [props.showPercentage] - 퍼센트 표시 여부
 * @param {string} [props.size] - 크기 (sm, md, lg)
 * @returns {HTMLElement} 프로그레스 미터 DOM 엘리먼트
 */
export function createProgressMeter({ 
  value, 
  max, 
  className = '', 
  showPercentage = false,
  size = 'md'
}) {
  const container = document.createElement('div');
  container.className = `progress-meter-container ${size} ${className}`.trim();
  
  const percentage = Math.min((value / max) * 100, 100);
  const status = getProgressStatus(percentage);
  const statusClass = getStatusClass(status);
  
  const progressBar = document.createElement('div');
  progressBar.className = 'weaver-progress-meter';
  
  const progressFill = document.createElement('div');
  progressFill.className = `weaver-progress-fill ${statusClass}`;
  progressFill.style.width = `${percentage}%`;
  
  progressBar.appendChild(progressFill);
  container.appendChild(progressBar);
  
  if (showPercentage) {
    const percentageText = document.createElement('div');
    percentageText.className = 'progress-percentage';
    percentageText.textContent = formatPercentage(value, max);
    container.appendChild(percentageText);
  }
  
  return container;
}

/**
 * 메모리 사용량 프로그레스 미터를 생성합니다
 * @param {Object} props - 메모리 프로그레스 속성
 * @param {number} props.used - 사용된 메모리 (bytes)
 * @param {number} props.total - 전체 메모리 (bytes)
 * @param {string} [props.type] - 타입 (heap, rss)
 * @returns {HTMLElement} 메모리 프로그레스 미터 DOM 엘리먼트
 */
export function createMemoryProgressMeter({ used, total, type = 'memory' }) {
  const container = createProgressMeter({
    value: used,
    max: total,
    showPercentage: true,
    className: `memory-progress ${type}`
  });
  
  return container;
}

/**
 * 스토리지 사용량 프로그레스 미터를 생성합니다
 * @param {Object} props - 스토리지 프로그레스 속성
 * @param {number} props.used - 사용된 스토리지 (bytes)
 * @param {number} props.available - 사용가능한 스토리지 (bytes)
 * @returns {HTMLElement} 스토리지 프로그레스 미터 DOM 엘리먼트
 */
export function createStorageProgressMeter({ used, available }) {
  const total = used + available;
  
  const container = createProgressMeter({
    value: used,
    max: total,
    showPercentage: true,
    className: 'storage-progress'
  });
  
  return container;
}

/**
 * 퍼센트 값에 따른 상태를 반환합니다
 * @param {number} percentage - 퍼센트 값
 * @returns {string} 상태 (success, warning, error)
 */
function getProgressStatus(percentage) {
  if (percentage >= 90) return 'error';
  if (percentage >= 70) return 'warning';
  return 'success';
}