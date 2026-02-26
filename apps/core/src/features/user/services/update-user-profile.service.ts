import { Inject, Injectable } from '@nestjs/common';
import * as path from 'path';
import { PrismaService } from '@weaver2/prisma';
import { STORAGE_PROVIDER, StorageProvider } from '@weaver2/upload';

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

    const { path: filePath } = await this.storage.save(file, directory);
    const imageUrl = await this.storage.getFileUrl(filePath);

    await this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: imageUrl },
    });

    return imageUrl;
  }
}
