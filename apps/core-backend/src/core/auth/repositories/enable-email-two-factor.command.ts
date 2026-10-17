import { PrismaClient } from '@weaver2/prisma';

/** 이메일 2FA 를 켠다. 이미 켜져 있으면 그대로 둔다. */
export async function EnableEmailTwoFactorCommand(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  await prisma.twoFactorMethod.upsert({
    where: { userId_kind: { userId, kind: 'EMAIL' } },
    create: { userId, kind: 'EMAIL', confirmedAt: new Date() },
    update: {},
  });
}
