import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { File } from '@prisma/client';

@Injectable()
export class UpdateFileCommand {
  constructor(private readonly prisma: PrismaService) {}

  async linkToPost(id: string, postId: string): Promise<File> {
    return this.prisma.file.update({
      where: { id },
      data: { postId },
    });
  }
}
