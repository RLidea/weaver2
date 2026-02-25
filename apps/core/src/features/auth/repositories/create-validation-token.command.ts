import { PrismaService } from '@weaver2/prisma';
import { generateTokenUtil } from '@weaver2/common/utility/generate-token.util';

export async function CreateValidationTokenCommand(
  prisma: PrismaService,
  options: { userId: string },
) {
  const verificationToken = generateTokenUtil();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1시간

  await prisma.localCredential.update({
    where: { userId: options.userId },
    data: { verificationToken, verificationTokenExpiry: expiresAt },
  });
  return {
    verificationToken,
    expiresAt,
  };
}
