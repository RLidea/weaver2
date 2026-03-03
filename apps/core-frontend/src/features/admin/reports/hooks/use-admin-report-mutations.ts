import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminReportsApi } from '../api/admin-reports.api';
import { adminReportKeys } from '../query-keys';
import type { ResolveReportRequest } from '../types';

export function useStartReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminReportsApi.startReview(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminReportKeys.all });
    },
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResolveReportRequest }) =>
      adminReportsApi.resolve(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminReportKeys.all });
    },
  });
}

export function useDismissReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, moderatorNote }: { id: string; moderatorNote?: string }) =>
      adminReportsApi.dismiss(id, moderatorNote),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminReportKeys.all });
    },
  });
}
