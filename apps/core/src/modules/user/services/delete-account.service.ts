import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

@Injectable()
export class DeleteAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<void> {
    // Find the Auth record associated with the user
    const auth = await this.prisma.auth.findUnique({
      where: { userId: userId },
    });

    if (!auth) {
      throw new NotFoundException('User authentication record not found.');
    }

    // Use a transaction to ensure both operations succeed or fail together
    await this.prisma.$transaction(async (tx) => {
      // Soft delete the User record
      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
        },
      });

      // Hard delete the Auth record (which will cascade delete RefreshTokens and OAuthConnections)
      await tx.auth.delete({
        where: { id: auth.id },
      });
    });
  }
}
