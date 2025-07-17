import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

@Injectable()
export class UpdateUserProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfileImage(userId: string, imageUrl: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: imageUrl },
    });
  }
}
