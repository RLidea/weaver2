'use client';

import { cn } from '@/shared/lib/cn';
import { useBoards } from '@/features/board/hooks/use-boards';
import type { SearchType } from '../types';

const TYPE_TABS: { label: string; value: SearchType }[] = [
  { label: '전체', value: 'all' },
  { label: '게시글', value: 'posts' },
  { label: '댓글', value: 'comments' },
];

interface SearchFiltersProps {
  type: SearchType;
  boardId: string;
  onTypeChange: (type: SearchType) => void;
  onBoardChange: (boardId: string) => void;
}

export function SearchFilters({
  type,
  boardId,
  onTypeChange,
  onBoardChange,
}: SearchFiltersProps) {
  const { data: boards = [] } = useBoards();

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 타입 탭 */}
      <div className="flex rounded-md border border-border bg-surface-2 p-0.5">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTypeChange(tab.value)}
            className={cn(
              'rounded px-3 py-1.5 text-sm font-medium transition-colors',
              type === tab.value
                ? 'bg-surface text-text shadow-sm'
                : 'text-text-muted hover:text-text',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 게시판 필터 */}
      {boards.length > 0 && (
        <select
          value={boardId}
          onChange={(e) => onBoardChange(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">전체 게시판</option>
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
