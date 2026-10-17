import { apiClient } from '@weaver2/api-client';
import type { EmailTemplate, UpdateEmailTemplateRequest } from '../types';

export const adminEmailTemplatesApi = {
  // 꺼진 템플릿도 받는다 — 목록에서 보고 다시 켤 수 있어야 한다
  getAll: () =>
    apiClient.get<EmailTemplate[]>('/v1/email/templates?activeOnly=false'),

  getById: (id: string) =>
    apiClient.get<EmailTemplate>(`/v1/email/templates/${id}`),

  update: (id: string, body: UpdateEmailTemplateRequest) =>
    apiClient.post<EmailTemplate>(`/v1/email/templates/${id}`, body),
};
