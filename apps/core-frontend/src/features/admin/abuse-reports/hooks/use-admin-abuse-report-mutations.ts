import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAbuseReportsApi } from '../api/admin-abuse-reports.api';
import { adminAbuseReportKeys } from '../query-keys';
import type { ResolveAbuseReportRequest } from '../types';

export function useStartReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminAbuseReportsApi.startReview(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminAbuseReportKeys.all,
      });
    },
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ResolveAbuseReportRequest;
    }) => adminAbuseReportsApi.resolve(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminAbuseReportKeys.all,
      });
    },
  });
}

export function useDismissReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      moderatorNote,
    }: {
      id: string;
      moderatorNote?: string;
    }) => adminAbuseReportsApi.dismiss(id, moderatorNote),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminAbuseReportKeys.all,
      });
    },
  });
}
