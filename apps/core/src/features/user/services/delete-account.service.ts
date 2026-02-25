import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { SoftDeleteUserCommand } from '../repositories/soft-delete-user.command';

@Injectable()
export class DeleteAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Soft delete the User record.
    // LocalCredential, OAuthAccount, RefreshToken are hard-deleted via Cascade.
    await SoftDeleteUserCommand(this.prisma, userId);
  }
}
