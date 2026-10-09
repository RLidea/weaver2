import { PrismaClient } from '@weaver2/prisma';

export async function CreateEmailChangeRequestCommand(
  prisma: PrismaClient,
  userId: string,
  newEmail: string,
  codeHash: string,
  expiresAt: Date,
) {
  // Delete any existing requests for this user before creating a new one
  await prisma.emailChangeRequest.deleteMany({ where: { userId } });

  return prisma.emailChangeRequest.create({
    data: {
      userId,
      newEmail,
      codeHash,
      expiresAt,
    },
  });
}
