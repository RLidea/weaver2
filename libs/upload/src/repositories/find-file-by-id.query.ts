import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { PostFile } from '@prisma/client';

@Injectable()
export class FindFileByIdQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string): Promise<PostFile | null> {
    return this.prisma.postFile.findFirst({
      where: { id, deletedAt: null },
    });
  }
}
