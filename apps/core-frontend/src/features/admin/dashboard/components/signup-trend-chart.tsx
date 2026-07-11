'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Spinner } from '@weaver2/ui';
import { useUserAnalytics } from '../hooks/use-admin-analytics';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function SignupTrendChart() {
  const { data, isLoading } = useUserAnalytics();

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  const chartData = (data?.signupTrends ?? []).map((item) => ({
    date: formatDate(item.date),
    가입자: item.count,
  }));

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="mb-4 text-sm font-semibold text-text">가입자 추이 (30일)</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              fontSize: 12,
            }}
            itemStyle={{ color: 'var(--color-text)' }}
            labelStyle={{ color: 'var(--color-text-muted)', marginBottom: 4 }}
          />
          <Line
            type="monotone"
            dataKey="가입자"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
