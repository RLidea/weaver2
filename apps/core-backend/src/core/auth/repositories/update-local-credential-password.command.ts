import { Prisma, PrismaClient } from '@weaver2/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * 비밀번호를 바꾸고, 살아 있던 재설정 링크를 버린다 — 바꾼 뒤에 옛 링크로 다시 바꾸지 못하게.
 * 이메일 인증 상태는 건드리지 않는다(재설정 경로가 users."emailVerifiedAt" 으로 따로 정한다).
 */
export async function UpdateLocalCredentialPasswordCommand(
  prisma: Db,
  userId: string,
  hashedPassword: string,
) {
  await prisma.localCredential.update({
    where: { userId },
    data: { password: hashedPassword },
  });
  await prisma.oneTimeCode.deleteMany({
    where: { userId, purpose: 'PASSWORD_RESET' },
  });
}
