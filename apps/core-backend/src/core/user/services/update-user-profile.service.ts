import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import {
  LockAttachableFilesCommand,
  STORAGE_PROVIDER,
  StorageProvider,
  uploadFileType,
  UploadService,
} from '@weaver2/upload';

@Injectable()
export class UpdateUserProfileService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly uploads: UploadService,
  ) {}

  /** 이미지를 올리고 곧바로 프로필로 지정한다. 돌려주는 값은 /v1/files 주소 */
  async uploadProfileImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    // 컨트롤러의 fileFilter 는 선언한 Content-Type 만 본다 — 바이트로 이미지인지 확인하고,
    // 확장자도 그 형식에서 정한다(사용자 파일명의 .html 이 그대로 저장되지 않게)
    const fileType = uploadFileType(file.mimetype);
    if (!fileType?.inline || !fileType.matches(file.buffer)) {
      throw new BadRequestException('이미지 파일만 업로드할 수 있습니다.');
    }

    const { path: storageKey } = await this.storage.save(
      file,
      this.uploads.directoryFor(new Date()),
      { ext: fileType.ext, contentType: file.mimetype, inline: true },
    );
    const record = await this.prisma.file.create({
      data: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.buffer.length,
        storageKey,
        uploadedById: userId,
      },
    });

    await this.assignProfileImage(userId, record.id);
    return this.uploads.urlFor(record.id);
  }

  /**
   * 프로필 이미지 지정 (파일 접근 통제 설계 §4.4) — 그 사람이 올렸고, 아무 데도 안 붙었고,
   * 인라인 이미지 형식일 때만. 이전 프로필 파일은 떼고 지움 표시를 한다(보존 기간 뒤 정리).
   */
  async assignProfileImage(userId: string, fileId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const [file] = await LockAttachableFilesCommand(tx, [fileId], userId);
      if (!uploadFileType(file.mimeType)?.inline) {
        throw new BadRequestException('이미지 파일만 프로필로 쓸 수 있습니다.');
      }

      const previous = await tx.user.findUnique({
        where: { id: userId },
        select: { profileImageFileId: true },
      });
      await tx.user.update({
        where: { id: userId },
        data: { profileImageFileId: fileId },
      });
      if (previous?.profileImageFileId) {
        await tx.file.update({
          where: { id: previous.profileImageFileId },
          data: { deletedAt: new Date() },
        });
      }
    });
  }
}
