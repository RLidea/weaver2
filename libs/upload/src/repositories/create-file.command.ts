import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { PostFile } from '@prisma/client';

export interface CreateFileInput {
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  path: string;
  thumbnailPath?: string;
  postId?: string;
  uploadedById?: string;
}

@Injectable()
export class CreateFileCommand {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CreateFileInput): Promise<PostFile> {
    return this.prisma.postFile.create({ data: input });
  }
}
