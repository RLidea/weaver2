import { PrismaService } from '@weaver2/prisma';
import { hashToken } from '../utils/auth-crypto.util';

export function FindLocalCredentialByTokenQuery(
  prisma: PrismaService,
  options: {
    verificationToken: string;
  },
) {
  // 원문 인증 토큰을 해시해 조회한다(DB는 해시 저장).
  return prisma.localCredential.findUnique({
    where: { verificationToken: hashToken(options.verificationToken) },
  });
}
