import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as path from 'path';
import { PrismaService } from '@weaver2/prisma';
import {
  STORAGE_PROVIDER,
  StorageProvider,
  UPLOAD_FILE_TYPES,
} from '@weaver2/upload';

@Injectable()
export class UpdateUserProfileService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async uploadProfileImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const directory = path.join('uploads', year, month);

    // 컨트롤러의 fileFilter 는 선언한 Content-Type 만 본다 — 바이트로 이미지인지 확인하고,
    // 확장자도 그 형식에서 정한다(사용자 파일명의 .html 이 그대로 저장되지 않게)
    const fileType = UPLOAD_FILE_TYPES[file.mimetype];
    if (!fileType?.inline || !fileType.matches(file.buffer)) {
      throw new BadRequestException('이미지 파일만 업로드할 수 있습니다.');
    }

    const { path: filePath } = await this.storage.save(file, directory, {
      ext: fileType.ext,
      contentType: file.mimetype,
      inline: true,
    });
    const imageUrl = await this.storage.getFileUrl(filePath);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profileImagePath: true },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: imageUrl, profileImagePath: filePath },
    });

    if (user?.profileImagePath) {
      await this.storage.delete(user.profileImagePath);
    }

    return imageUrl;
  }
}
