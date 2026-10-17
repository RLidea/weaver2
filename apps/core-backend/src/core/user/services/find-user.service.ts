import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { User } from '@weaver2/prisma';
import { UploadService } from '@weaver2/upload';

import { findUserQuery } from '../repositories/find-user.query';
import { OffsetResponseDto } from '@weaver2/pagination';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';
import { CheckExistingUserQuery } from '../repositories/check-existing-user.query';
import { FindUserByIdQuery } from '../repositories/find-user-by-id.query';
import { FindUserByUsernameQuery } from '../repositories/find-user-by-username.query';
import { PermissionService } from '../../permission/services/permission.service';
import { UserDto } from '../dto/user.dto';

@Injectable()
export class FindUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadService,
    private readonly permissionService: PermissionService,
  ) {}

  async findUsers(
    query: PaginationRequestDto,
  ): Promise<OffsetResponseDto<User & { profileImageUrl: string | null }>> {
    const page = await findUserQuery(this.prisma, query);
    return {
      ...page,
      data: page.data.map((u) => this.withFreshProfileImageUrl(u)),
    };
  }

  async findUserById(id: string): Promise<UserDto> {
    const user = await FindUserByIdQuery(this.prisma, id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    const userWithImage = this.withFreshProfileImageUrl(user);
    const permissionsSet = await this.permissionService.getUserPermissions(id);

    const setting = user.userSetting;

    return {
      id: userWithImage.id,
      username: userWithImage.username,
      displayName: userWithImage.displayName,
      email: userWithImage.email,
      profileImageUrl: userWithImage.profileImageUrl ?? null,
      permissions: Array.from(permissionsSet),
      userSetting: setting
        ? {
            isEmailNotificationsEnabled: setting.isEmailNotificationsEnabled,
            isSmsNotificationsEnabled: setting.isSmsNotificationsEnabled,
            isPushNotificationsEnabled: setting.isPushNotificationsEnabled,
            isMarketingConsentGiven: setting.isMarketingConsentGiven,
            isNewsletterSubscribed: setting.isNewsletterSubscribed,
            prefersDarkMode: setting.prefersDarkMode,
          }
        : undefined,
    };
  }

  /** 프로필 이미지 주소는 저장하지 않고 파일 id 로 만든다 — 받을 때마다 /v1/files 가 권한을 본다 */
  private withFreshProfileImageUrl<T extends User>(
    user: T,
  ): T & { profileImageUrl: string | null } {
    return {
      ...user,
      profileImageUrl: user.profileImageFileId
        ? this.uploads.urlFor(user.profileImageFileId)
        : null,
    };
  }

  async findUserByUsername(
    username: string,
  ): Promise<User & { profileImageUrl: string | null }> {
    const user = await FindUserByUsernameQuery(this.prisma, username);
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found.`);
    }
    return this.withFreshProfileImageUrl(user);
  }

  checkExistingUser(query: {
    username: string;
    displayName: string;
    email: string;
  }) {
    return CheckExistingUserQuery(this.prisma, query);
  }
}
