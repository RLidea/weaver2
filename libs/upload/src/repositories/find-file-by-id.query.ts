import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { File } from '@prisma/client';

@Injectable()
export class FindFileByIdQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string): Promise<File | null> {
    return this.prisma.file.findFirst({
      where: { id, deletedAt: null },
    });
  }
}
