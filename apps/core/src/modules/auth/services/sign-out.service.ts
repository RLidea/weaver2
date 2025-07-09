import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

@Injectable()
export class SignOutService {
  constructor(private readonly prisma: PrismaService) {}

  async signOut(authId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { authId },
    });
  }
}
