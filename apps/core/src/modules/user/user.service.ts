import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { Users } from '@prisma/client';

import { findUserQuery, PaginatedDto } from './queries/find-user.query';
import { FindUsersDto } from './queries/dto/find-users.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findUsers(findUsersDto: FindUsersDto): Promise<PaginatedDto<Users>> {
    return findUserQuery(this.prisma, findUsersDto);
  }
}
