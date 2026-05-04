import { useQuery } from '@tanstack/react-query';
import { adminEmailTemplatesApi } from '../api/admin-email-templates.api';

export const emailTemplateKeys = {
  all: ['admin', 'email-templates'] as const,
  detail: (id: string) => ['admin', 'email-templates', id] as const,
};

export function useAdminEmailTemplates() {
  return useQuery({
    queryKey: emailTemplateKeys.all,
    queryFn: () => adminEmailTemplatesApi.getAll(),
    select: (res) => res.data,
  });
}
