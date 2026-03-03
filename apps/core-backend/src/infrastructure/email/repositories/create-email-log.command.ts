import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { EmailStatus, Prisma } from '@prisma/client';

export interface CreateEmailLogData {
  to: string;
  from: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateId?: string;
  userId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class CreateEmailLogCommand {
  constructor(private readonly prisma: PrismaService) {}

  async execute(data: CreateEmailLogData) {
    return this.prisma.emailLog.create({
      data: {
        to: data.to,
        from: data.from,
        subject: data.subject,
        htmlContent: data.htmlContent,
        textContent: data.textContent,
        templateId: data.templateId,
        userId: data.userId,
        metadata: data.metadata,
        status: EmailStatus.PENDING,
      },
      include: {
        template: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });
  }
}
