import { PrismaService } from '@weaver2/prisma';
import { Prisma } from '@weaver2/prisma';
import { normalizeEmail } from '../utils/email.util';

export async function CreateOAuthUserCommand(
  prisma: PrismaService,
  options: {
    username: string;
    displayName: string;
    email: string;
    emailVerified: boolean;
    provider: string;
    providerId: string;
  },
): Promise<{ userId: string }> {
  const { username, displayName, email, emailVerified, provider, providerId } =
    options;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.create({
      data: {
        username,
        displayName,
        email: normalizeEmail(email),
        // 공급자가 이메일 주인임을 확인했으면 증명된 것으로 본다
        emailVerifiedAt: emailVerified ? new Date() : null,
      },
    });

    // 공급자 토큰은 저장하지 않는다 — OAuthService.findOrCreateUser 참조
    await tx.oAuthAccount.create({
      data: {
        provider,
        providerId,
        userId: user.id,
      },
    });

    return { userId: user.id };
  });
}
