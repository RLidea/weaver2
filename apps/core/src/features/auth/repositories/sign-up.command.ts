import { PrismaService } from '@weaver2/prisma';
import { Prisma, User } from '@prisma/client';

export function SignUpCommand(
  prisma: PrismaService,
  options: {
    username: string;
    displayName: string;
    email: string;
    hashedPassword: string;
  },
): Promise<User> {
  const { username, displayName, email, hashedPassword } = options;
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.create({
      data: {
        username,
        displayName,
      },
    });

    await tx.auth.create({
      data: {
        email,
        password: hashedPassword,
        userId: user.id,
      },
    });

    return user;
  });
}
