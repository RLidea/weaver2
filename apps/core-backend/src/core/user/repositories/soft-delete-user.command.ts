import { Prisma, PrismaClient } from '@weaver2/prisma';

/**
 * 탈퇴 표시를 하고, 그 사람에게 붙은 2FA 수단·일회용 비밀·잠금을 지운다.
 * 탈퇴 경로(본인·관리자)가 모두 이 명령을 부르므로 한 곳에서 정리한다.
 * 바깥 신원(`ssoSubject`)도 비운다 — 탈퇴 뒤 같은 신원이 다시 오면 탈퇴한 행이 아니라 새 계정이 된다.
 */
export async function SoftDeleteUserCommand(
  prisma: PrismaClient | Prisma.TransactionClient,
  userId: string,
) {
  await prisma.oneTimeCode.deleteMany({ where: { userId } });
  await prisma.twoFactorMethod.deleteMany({ where: { userId } });
  await prisma.authLockout.deleteMany({ where: { userId } });
  return prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      ssoSubject: null,
    },
  });
}
