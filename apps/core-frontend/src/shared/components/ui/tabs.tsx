import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface TabItem<T extends string = string> {
  id: T;
  label: ReactNode;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
}

/**
 * 어드민에서 반복되던 "border-b + active underline" 탭 패턴을 추출한 컴포넌트.
 */
export function Tabs<T extends string = string>({
  items,
  activeId,
  onChange,
  className,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-1 border-b border-border',
        className,
      )}
    >
      {items.map(({ id, label }) => {
        const isActive = activeId === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-b-2 border-primary text-primary'
                : 'text-text-muted hover:text-text',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
