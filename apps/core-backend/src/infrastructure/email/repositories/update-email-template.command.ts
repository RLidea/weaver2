import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

export interface UpdateEmailTemplateData {
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  variables?: string[];
  isActive?: boolean;
}

@Injectable()
export class UpdateEmailTemplateCommand {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, data: UpdateEmailTemplateData) {
    return this.prisma.emailTemplate.update({
      where: { id },
      data,
    });
  }
}
