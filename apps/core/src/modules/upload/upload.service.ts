import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

@Injectable()
export class UploadService {
  constructor(private readonly prisma: PrismaService) {}
  async updateUserProfileImage(
    userId: string,
    imageUrl: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: imageUrl },
    });
  }
}
