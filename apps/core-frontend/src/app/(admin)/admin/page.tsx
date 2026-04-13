import { DashboardStats } from '@/features/admin/dashboard/components/dashboard-stats';
import { SignupTrendChart } from '@/features/admin/dashboard/components/signup-trend-chart';
import { PostTrendChart } from '@/features/admin/dashboard/components/post-trend-chart';
import { TopBoardsChart } from '@/features/admin/dashboard/components/top-boards-chart';
import { RetentionCard } from '@/features/admin/dashboard/components/retention-card';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">관리자 대시보드</h1>
        <p className="mt-1 text-sm text-text-muted">시스템 현황을 확인하세요.</p>
      </div>

      {/* 요약 통계 카드 */}
      <DashboardStats />

      {/* 추이 차트 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SignupTrendChart />
        <PostTrendChart />
      </div>

      {/* 인기 게시판 + 리텐션 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TopBoardsChart />
        </div>
        <RetentionCard />
      </div>
    </div>
  );
}
