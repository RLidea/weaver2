import { forwardRef, useId } from 'react';
import { cn } from '../lib/cn';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, className, id, ...props }, ref) => {
    // `Input` 과 같은 폴백. 없으면 `id` 를 안 넘긴 호출부에서 `htmlFor=""` 인 라벨이
    // 그려져, 보이기만 하고 컨트롤을 잡지 못한다 — 라벨을 눌러도 열리지 않고
    // 스크린리더는 이름 없는 select 를 읽는다.
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-text">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text',
            'outline-none transition-colors',
            'focus:border-primary focus:ring-1 focus:ring-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-error focus:border-error focus:ring-error',
            className,
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
