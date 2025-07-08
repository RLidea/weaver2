import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { User } from '@prisma/client';

import { findUserQuery } from '../repositories/find-user.query';
import { PaginationResponseDto } from '@weaver2/pagination/dto/pagination-response.dto';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';
import { CheckExistingUserQuery } from '../repositories/check-existing-user.query';

@Injectable()
export class FindUserService {
  constructor(private readonly prisma: PrismaService) {}

  findUsers(query: PaginationRequestDto): Promise<PaginationResponseDto<User>> {
    return findUserQuery(this.prisma, query);
  }

  async findUserById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return user;
  }

  async findUserByUsername(username: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });
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
