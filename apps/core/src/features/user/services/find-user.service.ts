import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { User } from '@prisma/client';
import { STORAGE_PROVIDER, StorageProvider } from '@weaver2/upload';

import { findUserQuery } from '../repositories/find-user.query';
import { OffsetResponseDto } from '@weaver2/pagination';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';
import { CheckExistingUserQuery } from '../repositories/check-existing-user.query';
import { FindUserByIdQuery } from '../repositories/find-user-by-id.query';
import { FindUserByUsernameQuery } from '../repositories/find-user-by-username.query';

@Injectable()
export class FindUserService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  findUsers(query: PaginationRequestDto): Promise<OffsetResponseDto<User>> {
    return findUserQuery(this.prisma, query);
  }

  async findUserById(id: string): Promise<User> {
    const user = await FindUserByIdQuery(this.prisma, id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return this.withFreshProfileImageUrl(user);
  }

  private async withFreshProfileImageUrl<T extends User>(user: T): Promise<T> {
    if (!user.profileImagePath) return user;
    const profileImageUrl = await this.storage.getFileUrl(
      user.profileImagePath,
    );
    return { ...user, profileImageUrl };
  }

  async findUserByUsername(username: string): Promise<User> {
    const user = await FindUserByUsernameQuery(this.prisma, username);
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found.`);
    }
    return user;
  }

  checkExistingUser(query: {
    username: string;
    displayName: string;
    email: string;
  }) {
    return CheckExistingUserQuery(this.prisma, query);
  }
}
