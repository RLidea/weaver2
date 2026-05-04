import { apiClient } from '@/infrastructure/api-client';
import type { EmailTemplate, UpdateEmailTemplateRequest } from '../types';

export const adminEmailTemplatesApi = {
  getAll: () =>
    apiClient.get<EmailTemplate[]>('/v1/email/templates'),

  getById: (id: string) =>
    apiClient.get<EmailTemplate>(`/v1/email/templates/${id}`),

  update: (id: string, body: UpdateEmailTemplateRequest) =>
    apiClient.post<EmailTemplate>(`/v1/email/templates/${id}`, body),
};
