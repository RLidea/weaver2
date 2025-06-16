import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  findUsers() {
    return this.prisma.users.findMany();
  }
}
