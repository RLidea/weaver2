import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { DeleteRefreshTokensByAuthIdCommand } from '../repositories/delete-refresh-tokens-by-auth-id.command';

@Injectable()
export class SignOutService {
  constructor(private readonly prisma: PrismaService) {}

  async signOut(authId: string): Promise<void> {
    await DeleteRefreshTokensByAuthIdCommand(this.prisma, authId);
  }
}
