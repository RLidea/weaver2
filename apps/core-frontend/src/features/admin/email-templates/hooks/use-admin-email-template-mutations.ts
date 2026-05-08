import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminEmailTemplatesApi } from '../api/admin-email-templates.api';
import { emailTemplateKeys } from './use-admin-email-templates';
import type { UpdateEmailTemplateRequest } from '../types';

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateEmailTemplateRequest }) =>
      adminEmailTemplatesApi.update(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emailTemplateKeys.all });
    },
    // 호출부에서 toast.error를 직접 띄우므로 글로벌 핸들러 건너뜀
    meta: { skipGlobalErrorToast: true },
  });
}
