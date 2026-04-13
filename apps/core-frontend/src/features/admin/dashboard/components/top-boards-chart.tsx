'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Spinner } from '@/shared/components/ui/spinner';
import { useContentAnalytics } from '../hooks/use-admin-analytics';

export function TopBoardsChart() {
  const { data, isLoading } = useContentAnalytics();

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  const chartData = (data?.topBoards ?? [])
    .slice(0, 5)
    .map((item) => ({
      name: item.boardName,
      게시글: item.postCount,
      댓글: item.commentCount,
    }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5">
        <p className="mb-2 text-sm font-semibold text-text">인기 게시판 TOP 5</p>
        <p className="text-sm text-text-muted">데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="mb-4 text-sm font-semibold text-text">인기 게시판 TOP 5</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={80}
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
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => (
              <span style={{ color: 'var(--color-text-muted)' }}>{value}</span>
            )}
          />
          <Bar dataKey="게시글" fill="var(--color-primary)" radius={[0, 3, 3, 0]} />
          <Bar dataKey="댓글" fill="var(--color-success)" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
