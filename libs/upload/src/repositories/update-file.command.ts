import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { PostFile } from '@prisma/client';

@Injectable()
export class UpdateFileCommand {
  constructor(private readonly prisma: PrismaService) {}

  async linkToPost(id: string, postId: string): Promise<PostFile> {
    return this.prisma.postFile.update({
      where: { id },
      data: { postId },
    });
  }

  async unlinkFromPost(id: string): Promise<PostFile> {
    return this.prisma.postFile.update({
      where: { id },
      data: { postId: null },
    });
  }
}
