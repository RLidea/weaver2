import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { EmailStatus, Prisma } from '@prisma/client';

@Injectable()
export class UpdateEmailLogStatusCommand {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, status: EmailStatus, errorMessage?: string) {
    const updateData: Prisma.EmailLogUpdateInput = { status };

    if (status === EmailStatus.SENT) {
      updateData.sentAt = new Date();
    } else if (
      status === EmailStatus.FAILED ||
      status === EmailStatus.BOUNCED
    ) {
      updateData.failedAt = new Date();
      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }
    }

    return this.prisma.emailLog.update({
      where: { id },
      data: updateData,
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
