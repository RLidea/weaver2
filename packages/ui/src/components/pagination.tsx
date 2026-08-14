import { cn } from '../lib/cn';
import { Button } from './button';

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  /**
   * 세는 단위. 기본은 `건` — 무엇을 세든 통한다.
   *
   * 이 prop 이 생기기 전에는 `명` 이 박혀 있었다. 사용자 목록에서 태어난 컴포넌트라
   * 그랬는데, 그 탓에 다른 목록에 붙이면 게시글을 **"12명"** 이라고 셌다.
   * 재사용을 막는 것은 대개 이런 한 단어다.
   */
  unit?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  lastPage,
  total,
  limit,
  onPageChange,
  unit = '건',
  className,
}: PaginationProps) {
  const from = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const to = Math.min(currentPage * limit, total);

  const pages = buildPageNumbers(currentPage, lastPage);

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <p className="text-sm text-text-muted">
        {total > 0 ? (
          <>
            <span className="font-medium text-text">{from}–{to}</span> / {total}
            {unit}
          </>
        ) : (
          '결과 없음'
        )}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="이전 페이지"
        >
          ‹
        </Button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-text-muted">…</span>
          ) : (
            <Button
              key={p}
              variant={p === currentPage ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onPageChange(p as number)}
              aria-current={p === currentPage ? 'page' : undefined}
              className="min-w-[2rem]"
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage}
          aria-label="다음 페이지"
        >
          ›
        </Button>
      </div>
    </div>
  );
}

function buildPageNumbers(current: number, last: number): (number | '...')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(last - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < last - 2) pages.push('...');
  pages.push(last);

  return pages;
}
