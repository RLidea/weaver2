import { PrismaService } from '@weaver2/prisma';
import { ConflictException } from '@nestjs/common';

export async function CheckExistingUserQuery(
  prisma: PrismaService,
  options: { username: string; displayName: string; email: string },
): Promise<void> {
  const { username, displayName, email } = options;
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { displayName }, { auths: { some: { email } } }],
    },
    include: { auths: true },
  });
  if (existingUser) {
    throw new ConflictException('User already exist.');
  }
  return;
}
