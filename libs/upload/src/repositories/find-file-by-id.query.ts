import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { PostFile } from '@weaver2/prisma';

@Injectable()
export class FindFileByIdQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string): Promise<PostFile | null> {
    return this.prisma.postFile.findFirst({
      where: { id, deletedAt: null },
    });
  }
}
