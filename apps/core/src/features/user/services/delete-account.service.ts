import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { FindAuthByUserIdQuery } from '../../auth/repositories/find-auth-by-user-id.query';
import { SoftDeleteUserCommand } from '../repositories/soft-delete-user.command';
import { DeleteAuthCommand } from '../../auth/repositories/delete-auth.command';

@Injectable()
export class DeleteAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<void> {
    // Find the Auth record associated with the user
    const auth = await FindAuthByUserIdQuery(this.prisma, userId);

    if (!auth) {
      throw new NotFoundException('User authentication record not found.');
    }

    // Use a transaction to ensure both operations succeed or fail together
    await this.prisma.$transaction(async (tx) => {
      // Soft delete the User record
      await SoftDeleteUserCommand(tx, userId);

      // Hard delete the Auth record (which will cascade delete RefreshTokens and OAuthConnections)
      await DeleteAuthCommand(tx, auth.id);
    });
  }
}
