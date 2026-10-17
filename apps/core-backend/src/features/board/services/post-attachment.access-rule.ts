import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { CommonAuthUserDto } from '@weaver2/common';
import {
  FileAccessRule,
  FileAccessVerdict,
} from '../../../infrastructure/upload/file-access/file-access-rule';
import { FileAccessRuleRegistry } from '../../../infrastructure/upload/file-access/file-access-rule.registry';
import { PostReadPolicy } from './post-read-policy.service';

/** 게시글 첨부는 그 글을 읽을 수 있는 사람만 받는다. 비회원도 읽는 글이면 public */
@Injectable()
export class PostAttachmentAccessRule implements FileAccessRule, OnModuleInit {
  constructor(
    private readonly registry: FileAccessRuleRegistry,
    private readonly prisma: PrismaService,
    private readonly readPolicy: PostReadPolicy,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async decide(
    fileId: string,
    viewer: CommonAuthUserDto | undefined,
  ): Promise<FileAccessVerdict | null> {
    const attachment = await this.prisma.postAttachment.findUnique({
      where: { fileId },
      include: { post: true },
    });
    if (!attachment) return null;

    const { post } = attachment;
    if (await this.readPolicy.canRead(undefined, post)) return 'public';
    return (await this.readPolicy.canRead(viewer, post)) ? 'allow' : 'deny';
  }
}
