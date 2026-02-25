import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

@Injectable()
export class DeleteFileCommand {
  constructor(private readonly prisma: PrismaService) {}

  async softDelete(id: string): Promise<void> {
    await this.prisma.postFile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.postFile.delete({ where: { id } });
  }
}
