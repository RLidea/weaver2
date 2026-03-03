import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

export interface CreateEmailTemplateData {
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: string[];
  isActive?: boolean;
}

@Injectable()
export class CreateEmailTemplateCommand {
  constructor(private readonly prisma: PrismaService) {}

  async execute(data: CreateEmailTemplateData) {
    return this.prisma.emailTemplate.create({
      data: {
        name: data.name,
        subject: data.subject,
        htmlContent: data.htmlContent,
        textContent: data.textContent,
        variables: data.variables,
        isActive: data.isActive ?? true,
      },
    });
  }
}
