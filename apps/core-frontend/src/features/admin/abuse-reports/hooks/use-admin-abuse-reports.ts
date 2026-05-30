import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminAbuseReportsApi } from '../api/admin-abuse-reports.api';
import { adminAbuseReportKeys } from '../query-keys';
import type { AbuseReportsParams } from '../types';

export function useAdminAbuseReports(params?: AbuseReportsParams) {
  return useQuery({
    queryKey: adminAbuseReportKeys.lists(params),
    queryFn: () => adminAbuseReportsApi.getAll(params),
    select: (res) => res.data.data,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
