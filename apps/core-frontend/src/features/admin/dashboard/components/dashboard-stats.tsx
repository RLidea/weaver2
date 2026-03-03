'use client';

import { Spinner } from '@/shared/components/ui/spinner';
import { useAdminDashboard } from '../hooks/use-admin-dashboard';

interface StatCardProps {
  label: string;
  value: number;
  sub?: string;
  subValue?: number;
}

function StatCard({ label, value, sub, subValue }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-text">{value.toLocaleString()}</p>
      {sub && subValue !== undefined && (
        <p className="mt-1 text-xs text-text-muted">
          {sub}: <span className="font-medium text-success">+{subValue.toLocaleString()}</span>
        </p>
      )}
    </div>
  );
}

export function DashboardStats() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard
        label="전체 사용자"
        value={data.totalUsers}
        sub="오늘 가입"
        subValue={data.todaySignups}
      />
      <StatCard
        label="활성 사용자 (24h)"
        value={data.activeUsers}
      />
      <StatCard
        label="전체 게시글"
        value={data.totalPosts}
        sub="오늘 작성"
        subValue={data.todayPosts}
      />
      <StatCard
        label="전체 댓글"
        value={data.totalComments}
        sub="오늘 작성"
        subValue={data.todayComments}
      />
    </div>
  );
}
