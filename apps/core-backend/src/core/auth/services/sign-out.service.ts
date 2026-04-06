import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { DeleteRefreshTokenCommand } from '../repositories/delete-refresh-token.command';

@Injectable()
export class SignOutService {
  constructor(private readonly prisma: PrismaService) {}

  async signOut(token: string): Promise<void> {
    await DeleteRefreshTokenCommand(this.prisma, token);
  }
}
