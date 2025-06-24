import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { User } from '@prisma/client';

import { findUserQuery } from './repositories/find-user.query';
import { PaginationResponseDto } from '@weaver2/pagination/dto/pagination-response.dto';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';
import { CheckExistingUserQuery } from './repositories/check-existing-user.query';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  findUsers(query: PaginationRequestDto): Promise<PaginationResponseDto<User>> {
    return findUserQuery(this.prisma, query);
  }

  checkExistingUser(query: {
    username: string;
    displayName: string;
    email: string;
  }) {
    return CheckExistingUserQuery(this.prisma, query);
  }
}
