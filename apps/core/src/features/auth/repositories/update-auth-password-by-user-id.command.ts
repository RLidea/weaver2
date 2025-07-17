import { Prisma, PrismaClient } from '@prisma/client';

export async function UpdateAuthPasswordByUserIdCommand(
  prisma: PrismaClient | Prisma.TransactionClient,
  userId: string,
  hashedPassword: string,
) {
  // Find the Auth record associated with the userId (assuming one primary auth record per user for password)
  const auth = await prisma.auth.findFirst({
    where: { userId, password: { not: null } }, // Find auth with password for this user
  });

  if (!auth) {
    // Handle case where no auth record with password exists for this user
    // This might indicate an OAuth user or an error state
    throw new Error('Auth record with password not found for this user.');
  }

  return prisma.auth.update({
    where: { id: auth.id }, // Update by unique auth.id
    data: { password: hashedPassword },
  });
}
