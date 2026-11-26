import { forwardRef } from 'react';
import { cn } from '../lib/cn';
import { Spinner } from './spinner';

const VARIANT_CLASSES = {
  primary: 'bg-primary text-primary-fg hover:opacity-90',
  secondary: 'bg-surface-2 text-text border border-border hover:bg-surface',
  danger: 'bg-error text-error-fg hover:opacity-90',
  ghost: 'text-text hover:bg-surface-2',
} as const;

const SIZE_CLASSES = {
  sm: 'h-8 px-3 text-sm rounded-sm',
  md: 'h-10 px-4 text-sm rounded-md',
  lg: 'h-12 px-6 text-base rounded-md',
} as const;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANT_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(
          // 높이가 크기별로 고정이라 글자가 줄바꿈되면 칸 밖으로 넘친다. 좁은 표 칸에서 한글이
          // 한 글자씩 세로로 쪼개졌다 (관리자 사용자 표 액션 칸, 2026-11-26) — 줄바꿈 대신 칸이 넓어지게 한다
          'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium transition-opacity',
          'disabled:cursor-not-allowed disabled:opacity-50',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      >
        {isLoading && <Spinner size="sm" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
