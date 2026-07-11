'use client';

import { useToast } from '../providers/toast-provider';
import { cn } from '../lib/cn';

const STYLES = {
  success: 'bg-success text-success-fg',
  error: 'bg-error text-error-fg',
  info: 'bg-surface border border-border text-text',
} as const;

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
} as const;

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={cn(
            'flex min-w-64 max-w-sm items-center gap-3 rounded-lg px-4 py-3 shadow-[var(--shadow-card)]',
            STYLES[toast.type],
          )}
        >
          <span className="text-sm font-bold">{ICONS[toast.type]}</span>
          <span className="flex-1 text-sm">{toast.message}</span>
          <button
            onClick={() => dismiss(toast.id)}
            className="text-sm opacity-70 hover:opacity-100"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
