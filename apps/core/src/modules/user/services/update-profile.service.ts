import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class UpdateProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<void> {
    const { displayName, username, ...userSettings } = updateProfileDto;

    if (displayName) {
      const existingUser = await this.prisma.user.findUnique({
        where: { displayName },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Display name already taken.');
      }
    }

    if (username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Username already taken.');
      }
    }

    // Update User model fields
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(displayName && { displayName }),
        ...(username && { username }),
      },
    });

    // Update or create UserSetting fields
    if (Object.keys(userSettings).length > 0) {
      await this.prisma.userSetting.upsert({
        where: { userId },
        update: { ...userSettings },
        create: {
          userId,
          ...userSettings,
        },
      });
    }
  }
}
