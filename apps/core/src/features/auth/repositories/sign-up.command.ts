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
        email,
      },
    });

    await tx.localCredential.create({
      data: {
        password: hashedPassword,
        userId: user.id,
      },
    });

    return user;
  });
}
