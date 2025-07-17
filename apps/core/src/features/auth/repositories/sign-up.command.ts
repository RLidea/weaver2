import { PrismaService } from '@weaver2/prisma';
import { Prisma, Role, User } from '@prisma/client';

export function SignUpCommand(
  prisma: PrismaService,
  options: {
    username: string;
    displayName: string;
    role: Role;
    email: string;
    hashedPassword: string;
  },
): Promise<User> {
  const { username, displayName, role, email, hashedPassword } = options;
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.create({
      data: {
        username,
        displayName,
        role,
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
