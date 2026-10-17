import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { FileAccessRule, FileAccessVerdict } from './file-access-rule';
import { FileAccessRuleRegistry } from './file-access-rule.registry';

/** 프로필 이미지는 누구나 본다 */
@Injectable()
export class ProfileImageAccessRule implements FileAccessRule, OnModuleInit {
  constructor(
    private readonly registry: FileAccessRuleRegistry,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async decide(fileId: string): Promise<FileAccessVerdict | null> {
    const owner = await this.prisma.user.findUnique({
      where: { profileImageFileId: fileId },
      select: { id: true },
    });
    return owner ? 'public' : null;
  }
}
