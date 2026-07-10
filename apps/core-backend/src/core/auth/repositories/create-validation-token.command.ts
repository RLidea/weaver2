import { PrismaService } from '@weaver2/prisma';
import { generateTokenUtil } from '@weaver2/common/utility/generate-token.util';
import { hashToken } from '../utils/auth-crypto.util';

export async function CreateValidationTokenCommand(
  prisma: PrismaService,
  options: { userId: string },
) {
  const verificationToken = generateTokenUtil();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1시간

  // DB에는 해시로 저장하고, 원문은 이메일 인증 링크로만 전달한다.
  await prisma.localCredential.update({
    where: { userId: options.userId },
    data: {
      verificationToken: hashToken(verificationToken),
      verificationTokenExpiry: expiresAt,
    },
  });
  return {
    verificationToken,
    expiresAt,
  };
}
