'use client';

import { useMemo } from 'react';
import { cn } from '../lib/cn';
import { diffByLine, type DiffLine } from '../lib/line-diff';

export interface RevisionDiffProps {
  /** 옛 판의 본문 */
  before: string;
  /** 새 판의 본문 */
  after: string;
  className?: string;
}

const KIND_STYLE: Record<DiffLine['kind'], { row: string; symbol: string; label?: string }> = {
  added: { row: 'bg-success/10', symbol: '+', label: '추가' },
  removed: { row: 'bg-error/10', symbol: '-', label: '삭제' },
  unchanged: { row: '', symbol: ' ' },
};

/**
 * 두 판을 줄 단위로 비교해 보인다. 추가 · 삭제는 색과 기호(+ · -)를 함께 쓴다 —
 * 색만으로 구분하면 색을 못 가리는 사람에게 차이가 사라진다.
 */
export function RevisionDiff({ before, after, className }: RevisionDiffProps) {
  const lines = useMemo(() => diffByLine(before, after), [before, after]);

  if (lines.every((line) => line.kind === 'unchanged')) {
    return (
      <p className={cn('py-6 text-center text-sm text-text-muted', className)}>
        두 판의 본문이 같습니다.
      </p>
    );
  }

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border bg-surface', className)}>
      <table className="w-full border-collapse font-mono text-xs leading-relaxed">
        <thead className="sr-only">
          <tr>
            <th scope="col">옛 줄</th>
            <th scope="col">새 줄</th>
            <th scope="col">변화</th>
            <th scope="col">내용</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const style = KIND_STYLE[line.kind];
            return (
              <tr key={index} className={style.row}>
                <td className="w-10 select-none px-2 text-right text-text-muted">
                  {line.oldNumber ?? ''}
                </td>
                <td className="w-10 select-none px-2 text-right text-text-muted">
                  {line.newNumber ?? ''}
                </td>
                <td
                  className={cn(
                    'w-5 select-none text-center font-semibold',
                    line.kind === 'added' && 'text-success',
                    line.kind === 'removed' && 'text-error',
                  )}
                >
                  {style.label ? <span aria-label={style.label}>{style.symbol}</span> : null}
                </td>
                <td className="whitespace-pre-wrap break-all pr-3 text-text">
                  {line.text || ' '}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
