import { Injectable } from '@nestjs/common';
import { File, PrismaService } from '@weaver2/prisma';

export interface CreateFileInput {
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  thumbnailKey?: string;
  uploadedById?: string;
}

@Injectable()
export class CreateFileCommand {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CreateFileInput): Promise<File> {
    return this.prisma.file.create({ data: input });
  }
}
