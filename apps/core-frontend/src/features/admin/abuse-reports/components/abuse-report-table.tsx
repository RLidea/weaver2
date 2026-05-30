'use client';

import { useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Spinner } from '@/shared/components/ui/spinner';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { useAdminAbuseReports } from '../hooks/use-admin-abuse-reports';
import { useStartReview } from '../hooks/use-admin-abuse-report-mutations';
import { AbuseReportResolveModal } from './abuse-report-resolve-modal';
import {
  ABUSE_REPORT_TARGET_LABELS,
  ABUSE_REPORT_REASON_LABELS,
  ABUSE_REPORT_STATUS_LABELS,
  type AbuseReport,
  type AbuseReportStatus,
  type AbuseReportTarget,
} from '../types';

const STATUS_VARIANT: Record<AbuseReportStatus, 'default' | 'warning' | 'primary' | 'success' | 'error'> = {
  PENDING: 'warning',
  REVIEWING: 'primary',
  RESOLVED: 'success',
  DISMISSED: 'default',
};

export function AbuseReportTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = (searchParams.get('status') as AbuseReportStatus) ?? undefined;
  const targetType = (searchParams.get('targetType') as AbuseReportTarget) ?? undefined;

  const { data, isLoading, isError } = useAdminAbuseReports({ status, targetType, limit: 30 });
  const { mutate: startReview, isPending: isStarting } = useStartReview();
  const [resolveReport, setResolveReport] = useState<AbuseReport | null>(null);

  const setFilter = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={status ?? ''}
          onChange={(e) => setFilter('status', e.target.value || undefined)}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus:border-primary"
        >
          <option value="">전체 상태</option>
          {(['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'] as AbuseReportStatus[]).map((s) => (
            <option key={s} value={s}>{ABUSE_REPORT_STATUS_LABELS[s]}</option>
          ))}
        </select>

        <select
          value={targetType ?? ''}
          onChange={(e) => setFilter('targetType', e.target.value || undefined)}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus:border-primary"
        >
          <option value="">전체 유형</option>
          {(['POST', 'COMMENT', 'USER', 'MEDIA'] as AbuseReportTarget[]).map((t) => (
            <option key={t} value={t}>{ABUSE_REPORT_TARGET_LABELS[t]}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-border bg-surface">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {isError && (
          <p className="py-16 text-center text-sm text-error">데이터를 불러오는 데 실패했습니다.</p>
        )}

        {data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 font-medium">사유</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium">신고일</th>
                  <th className="px-4 py-3 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-muted">
                      신고 내역이 없습니다.
                    </td>
                  </tr>
                )}
                {data.map((report) => (
                  <tr key={report.id} className="transition-colors hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <span className="text-text">{ABUSE_REPORT_TARGET_LABELS[report.targetType]}</span>
                      <p className="text-xs text-text-muted font-mono truncate max-w-[120px]">
                        {report.targetId}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {ABUSE_REPORT_REASON_LABELS[report.reason]}
                      {report.description && (
                        <p className="text-xs truncate max-w-[200px]">{report.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[report.status]}>
                        {ABUSE_REPORT_STATUS_LABELS[report.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {report.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            isLoading={isStarting}
                            onClick={() => startReview(report.id)}
                          >
                            검토
                          </Button>
                        )}
                        {(report.status === 'PENDING' || report.status === 'REVIEWING') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setResolveReport(report)}
                          >
                            처리
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AbuseReportResolveModal report={resolveReport} onClose={() => setResolveReport(null)} />
    </div>
  );
}
