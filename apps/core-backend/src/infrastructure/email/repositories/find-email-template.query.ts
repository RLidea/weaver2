import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

@Injectable()
export class FindEmailTemplateQuery {
  constructor(private readonly prisma: PrismaService) {}

  async findByName(name: string) {
    return this.prisma.emailTemplate.findUnique({
      where: {
        name,
        isActive: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.emailTemplate.findUnique({
      where: { id },
    });
  }

  async findAll(activeOnly: boolean = true) {
    const where = activeOnly ? { isActive: true } : {};

    return this.prisma.emailTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
