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

    await this.prisma.$transaction(async (tx) => {
      // ON DELETE CASCADE fires only on hard DELETE, not on soft-delete (UPDATE).
      // Explicitly hard-delete auth-related records before soft-deleting the User.
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.oAuthAccount.deleteMany({ where: { userId } });
      await tx.localCredential.deleteMany({ where: { userId } });

      await SoftDeleteUserCommand(tx, userId);
    });
  }
}
