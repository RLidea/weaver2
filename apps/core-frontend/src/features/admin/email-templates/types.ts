export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateEmailTemplateRequest {
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  isActive?: boolean;
}
