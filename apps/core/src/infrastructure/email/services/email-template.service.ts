import { Injectable } from '@nestjs/common';
import {
  CreateEmailTemplateCommand,
  CreateEmailTemplateData,
} from '../repositories/create-email-template.command';
import { FindEmailTemplateQuery } from '../repositories/find-email-template.query';
import {
  UpdateEmailTemplateCommand,
  UpdateEmailTemplateData,
} from '../repositories/update-email-template.command';

@Injectable()
export class EmailTemplateService {
  constructor(
    private readonly createEmailTemplateCommand: CreateEmailTemplateCommand,
    private readonly findEmailTemplateQuery: FindEmailTemplateQuery,
    private readonly updateEmailTemplateCommand: UpdateEmailTemplateCommand,
  ) {}

  async createTemplate(data: CreateEmailTemplateData) {
    return this.createEmailTemplateCommand.execute(data);
  }

  async findTemplateByName(name: string) {
    return this.findEmailTemplateQuery.findByName(name);
  }

  async findTemplateById(id: string) {
    return this.findEmailTemplateQuery.findById(id);
  }

  async findAllTemplates(activeOnly: boolean = true) {
    return this.findEmailTemplateQuery.findAll(activeOnly);
  }

  async updateTemplate(id: string, data: UpdateEmailTemplateData) {
    return this.updateEmailTemplateCommand.execute(id, data);
  }

  /**
   * 템플릿 변수를 실제 값으로 치환
   */
  renderTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  /**
   * 템플릿에서 사용된 변수들을 추출
   */
  extractTemplateVariables(template: string): string[] {
    const matches = template.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];

    return matches.map((match) => match.replace(/\{\{|\}\}/g, ''));
  }
}
