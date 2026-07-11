import { cn } from '../lib/cn';

const VARIANT_CLASSES = {
  default: 'bg-surface-2 text-text-muted',
  primary: 'bg-primary text-primary-fg',
  error: 'bg-error text-error-fg',
  success: 'bg-success text-success-fg',
  warning: 'bg-warning text-warning-fg',
} as const;

const SIZE_CLASSES = {
  sm: 'min-w-[1.125rem] h-[1.125rem] px-1 text-[0.625rem]',
  md: 'px-2 py-0.5 text-xs',
} as const;

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof VARIANT_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
}

export function Badge({ variant = 'default', size = 'md', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold leading-none',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
