import type { ReportsParams } from './types';

export const adminReportKeys = {
  all: ['admin', 'reports'] as const,
  lists: (params?: ReportsParams) => ['admin', 'reports', 'list', params] as const,
  detail: (id: string) => ['admin', 'reports', id] as const,
} as const;
