import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@weaver2/prisma';

@Injectable()
export class DeleteFileCommand {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 지움 표시와 함께 본체가 아는 붙음(게시글 첨부·프로필)을 끊는다 — 붙은 채로 두면 정리 작업이
   * FK 위반으로 영영 건너뛴다. 파생 프로젝트의 첨부는 본체가 모르므로 그쪽이 끊는다.
   */
  async softDelete(id: string, deletedAt: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.postAttachment.deleteMany({ where: { fileId: id } }),
      this.prisma.user.updateMany({
        where: { profileImageFileId: id },
        data: { profileImageFileId: null },
      }),
      this.prisma.file.update({ where: { id }, data: { deletedAt } }),
    ]);
  }

  /**
   * 행을 지운다. 아직 어딘가(파생 프로젝트의 첨부 등)에 붙어 있으면 FK 가 막는다 — false.
   * 행이 먼저, 저장소 객체는 호출자가 그다음에 지운다(행 없이 객체만 남는 쪽이 덜 나쁘다).
   */
  async hardDelete(id: string): Promise<boolean> {
    try {
      await this.prisma.file.delete({ where: { id } });
      return true;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        return false;
      }
      throw err;
    }
  }
}
