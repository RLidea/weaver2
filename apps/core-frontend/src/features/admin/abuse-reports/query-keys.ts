import type { AbuseReportsParams } from './types';

export const adminAbuseReportKeys = {
  all: ['admin', 'abuse-reports'] as const,
  lists: (params?: AbuseReportsParams) =>
    ['admin', 'abuse-reports', 'list', params] as const,
  detail: (id: string) => ['admin', 'abuse-reports', id] as const,
} as const;
