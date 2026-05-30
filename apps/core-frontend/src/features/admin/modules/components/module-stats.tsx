import { Card, CardContent } from '@/shared/components/ui/card';
import type { ModuleStats as ModuleStatsType } from '../types';

interface ModuleStatsProps {
  stats: ModuleStatsType;
}

interface StatItemProps {
  label: string;
  value: number;
  description: string;
}

function StatItem({ label, value, description }: StatItemProps) {
  return (
    <Card glass className="flex-1">
      <CardContent className="py-4">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        <p className="mt-1 text-2xl font-bold text-text">{value}</p>
        <p className="mt-0.5 text-xs text-text-muted">{description}</p>
      </CardContent>
    </Card>
  );
}

export function ModuleStats({ stats }: ModuleStatsProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <StatItem
        label="전체 모듈"
        value={stats.moduleCount}
        description="등록된 모듈 수"
      />
      <StatItem
        label="의존 관계"
        value={stats.edgeCount}
        description="전체 엣지 수"
      />
      <StatItem
        label="강한 의존 (hard)"
        value={stats.hardCount}
        description="필수 의존 관계"
      />
      <StatItem
        label="약한 의존 (soft)"
        value={stats.softCount}
        description="선택적 의존 관계"
      />
    </div>
  );
}
