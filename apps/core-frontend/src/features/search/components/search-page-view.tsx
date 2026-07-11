'use client';

import { useEffect, useState } from 'react';
import { SearchIcon, useUrlState } from '@weaver2/ui';
import { useSearch } from '../hooks/use-search';
import { SearchFilters } from './search-filters';
import { SearchResults } from './search-results';
import type { SearchType } from '../types';

const LIMIT = 20;
const MAX_PAGE = 100;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function SearchPageView() {
  const [urlState, setValues] = useUrlState(
    {
      q: { default: '' },
      type: { default: 'all' as SearchType },
      boardId: { default: '' },
      page: { default: 1, parse: Number },
    },
    { resetKeys: ['page'] },
  );
  const { q, type, boardId, page } = urlState;

  const [inputValue, setInputValue] = useState(q);
  const debouncedInput = useDebounce(inputValue, 400);

  // 디바운스된 입력으로 URL 업데이트
  useEffect(() => {
    if (debouncedInput !== q) {
      setValues({ q: debouncedInput });
    }
  }, [debouncedInput, q, setValues]);

  const { data, isLoading } = useSearch(
    { q, type, boardId: boardId || undefined, page, limit: LIMIT },
    q.trim().length > 0,
  );

  const totalPages = Math.min(
    Math.max(
      Math.ceil(((type === 'comments' ? data?.total.comments : data?.total.posts) ?? 0) / LIMIT),
      1,
    ),
    MAX_PAGE,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* 검색 입력 */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="게시글, 댓글 검색..."
          autoFocus
          className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-4 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* 필터 */}
      <SearchFilters
        type={type}
        boardId={boardId}
        onTypeChange={(t) => setValues({ type: t })}
        onBoardChange={(id) => setValues({ boardId: id })}
      />

      {/* 결과 */}
      <SearchResults data={data} query={q} type={type} isLoading={isLoading} />

      {/* 페이지네이션 */}
      {q.trim() && !isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setValues({ page: page - 1 })}
            disabled={page <= 1}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-sm text-text-muted">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setValues({ page: page + 1 })}
            disabled={page >= totalPages}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
