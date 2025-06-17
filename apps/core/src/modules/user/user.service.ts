import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { Users } from '@prisma/client';

import { findUserQuery } from './queries/find-user.query';
import { PaginationResponseDto } from '@weaver2/pagination/dto/pagination-response.dto';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  findUsers(
    query: PaginationRequestDto,
  ): Promise<PaginationResponseDto<Users>> {
    return findUserQuery(this.prisma, query);
  }
}
