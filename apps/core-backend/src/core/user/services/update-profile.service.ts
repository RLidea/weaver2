import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { FindUserByDisplayNameQuery } from '../repositories/find-user-by-display-name.query';
import { FindUserByUsernameQuery } from '../repositories/find-user-by-username.query';
import { UpdateUserCommand } from '../repositories/update-user.command';
import { UpsertUserSettingCommand } from '../repositories/upsert-user-setting.command';
import { isReservedUsername, isReservedDisplayName } from '@weaver2/common';

@Injectable()
export class UpdateProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<void> {
    const { displayName, username, ...userSettings } = updateProfileDto;

    if (displayName) {
      if (isReservedDisplayName(displayName)) {
        throw new BadRequestException('사용할 수 없는 닉네임입니다.');
      }

      const existingUser = await FindUserByDisplayNameQuery(
        this.prisma,
        displayName,
      );

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Display name already taken.');
      }
    }

    if (username) {
      if (isReservedUsername(username)) {
        throw new BadRequestException('사용할 수 없는 사용자 이름입니다.');
      }

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

    // Update or create UserSetting fields (DTO 필드명 → Prisma 필드명 매핑)
    const settingData: Record<string, unknown> = {};
    if (userSettings.marketingConsent !== undefined)
      settingData.isMarketingConsentGiven = userSettings.marketingConsent;
    if (userSettings.newsletterConsent !== undefined)
      settingData.isNewsletterSubscribed = userSettings.newsletterConsent;
    if (userSettings.emailNotification !== undefined)
      settingData.isEmailNotificationsEnabled = userSettings.emailNotification;
    if (userSettings.smsNotification !== undefined)
      settingData.isSmsNotificationsEnabled = userSettings.smsNotification;
    if (userSettings.pushNotification !== undefined)
      settingData.isPushNotificationsEnabled = userSettings.pushNotification;
    if (userSettings.darkMode !== undefined)
      settingData.prefersDarkMode = userSettings.darkMode;

    if (Object.keys(settingData).length > 0) {
      await UpsertUserSettingCommand(this.prisma, userId, settingData);
    }
  }
}
