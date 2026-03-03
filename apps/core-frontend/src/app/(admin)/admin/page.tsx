import { DashboardStats } from '@/features/admin/dashboard/components/dashboard-stats';

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text">관리자 대시보드</h1>
      <p className="mt-1 text-sm text-text-muted">시스템 현황을 확인하세요.</p>
      <div className="mt-6">
        <DashboardStats />
      </div>
    </div>
  );
}
