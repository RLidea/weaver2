import { Injectable } from '@nestjs/common';
import { File, PrismaService } from '@weaver2/prisma';

@Injectable()
export class FindFileByIdQuery {
  constructor(private readonly prisma: PrismaService) {}

  /** 지운 파일도 돌려준다 — 내줄지는 FileAccessService 가 정한다 */
  async execute(id: string): Promise<File | null> {
    return this.prisma.file.findUnique({ where: { id } });
  }
}
