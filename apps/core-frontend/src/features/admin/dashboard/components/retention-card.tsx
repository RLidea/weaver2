'use client';

import { Spinner } from '@weaver2/ui';
import { useUserAnalytics } from '../hooks/use-admin-analytics';

interface RetentionItemProps {
  label: string;
  value: number;
}

function RetentionItem({ label, value }: RetentionItemProps) {
  const pct = Math.min(100, Math.round(value * 10) / 10);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="text-xs font-semibold text-text">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function RetentionCard() {
  const { data, isLoading } = useUserAnalytics();

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="mb-4 text-sm font-semibold text-text">리텐션</p>

      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Spinner size="sm" />
        </div>
      ) : (
        <div className="space-y-3">
          <RetentionItem
            label="DAU (일간 활성 사용자)"
            value={data?.retentionRate.daily ?? 0}
          />
          <RetentionItem
            label="WAU (주간 활성 사용자)"
            value={data?.retentionRate.weekly ?? 0}
          />
          <RetentionItem
            label="MAU (월간 활성 사용자)"
            value={data?.retentionRate.monthly ?? 0}
          />
        </div>
      )}
    </div>
  );
}
