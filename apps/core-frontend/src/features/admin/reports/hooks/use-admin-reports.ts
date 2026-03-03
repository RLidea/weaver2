import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminReportsApi } from '../api/admin-reports.api';
import { adminReportKeys } from '../query-keys';
import type { ReportsParams } from '../types';

export function useAdminReports(params?: ReportsParams) {
  return useQuery({
    queryKey: adminReportKeys.lists(params),
    queryFn: () => adminReportsApi.getAll(params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
