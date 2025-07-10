import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { FindUserByDisplayNameQuery } from '../repositories/find-user-by-display-name.query';
import { FindUserByUsernameQuery } from '../repositories/find-user-by-username.query';
import { UpdateUserCommand } from '../repositories/update-user.command';
import { UpsertUserSettingCommand } from '../repositories/upsert-user-setting.command';

@Injectable()
export class UpdateProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<void> {
    const { displayName, username, ...userSettings } = updateProfileDto;

    if (displayName) {
      const existingUser = await FindUserByDisplayNameQuery(
        this.prisma,
        displayName,
      );

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Display name already taken.');
      }
    }

    if (username) {
      const existingUser = await FindUserByUsernameQuery(this.prisma, username);

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Username already taken.');
      }
    }

    // Update User model fields
    await UpdateUserCommand(this.prisma, userId, {
      ...(displayName && { displayName }),
      ...(username && { username }),
    });

    // Update or create UserSetting fields
    if (Object.keys(userSettings).length > 0) {
      await UpsertUserSettingCommand(this.prisma, userId, userSettings);
    }
  }
}
