import { cn } from '@/shared/lib/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export function Card({ glass = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border shadow-[var(--shadow-card)]',
        glass
          ? 'bg-surface/80 backdrop-blur-[var(--blur-backdrop)]'
          : 'bg-surface',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-b border-border px-6 py-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-t border-border px-6 py-4', className)} {...props}>
      {children}
    </div>
  );
}
