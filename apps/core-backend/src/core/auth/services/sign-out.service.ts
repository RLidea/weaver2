import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { DeleteRefreshTokensByUserIdCommand } from '../repositories/delete-refresh-tokens-by-user-id.command';

@Injectable()
export class SignOutService {
  constructor(private readonly prisma: PrismaService) {}

  async signOut(userId: string): Promise<void> {
    await DeleteRefreshTokensByUserIdCommand(this.prisma, userId);
  }
}
