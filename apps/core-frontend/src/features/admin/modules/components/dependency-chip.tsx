import { cn } from '@/shared/lib/cn';
import type { DependencyKind } from '../types';

interface DependencyChipProps {
  /** 의존/역의존 대상 모듈 id */
  id: string;
  /** hard = 끊기면 컴파일 깨짐(강조), soft = 느슨한 결합(옅음) */
  kind: DependencyKind;
  className?: string;
}

/**
 * 의존 관계 칩.
 *
 * hard/soft를 두 가지 채널로 동시에 표현해 한눈에 위험도를 읽게 한다:
 *   1) 색  — hard는 error 토큰(강조), soft는 surface-2/muted(자연 비활성)
 *   2) 점  — hard는 채워진 점(●), soft는 빈 점(○)  → 색맹/빠른 스캔 대비
 *
 * 모듈 카드와 그래프 뷰 양쪽에서 재사용하기 위해 분리한 보조 컴포넌트.
 */
export function DependencyChip({ id, kind, className }: DependencyChipProps) {
  const isHard = kind === 'hard';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium leading-none',
        isHard
          ? 'border-error/40 bg-error/10 text-error'
          : 'border-border bg-surface-2 text-text-muted',
        className,
      )}
      title={isHard ? `${id} · 강한 의존 (hard)` : `${id} · 느슨한 의존 (soft)`}
    >
      <span aria-hidden="true" className="text-[0.625rem] leading-none">
        {isHard ? '●' : '○'}
      </span>
      <span className="truncate">{id}</span>
      <span className="sr-only">{isHard ? '강한 의존' : '느슨한 의존'}</span>
    </span>
  );
}
