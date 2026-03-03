import { cn } from '@/shared/lib/cn';
import { Button } from './button';

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  lastPage,
  total,
  limit,
  onPageChange,
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
            <span className="font-medium text-text">{from}–{to}</span> / {total}명
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
