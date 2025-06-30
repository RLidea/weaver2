import { PrismaService } from '@weaver2/prisma';
import { generateTokenUtil } from '@weaver2/common/utility/generate-token.util';

export async function CreateValidationTokenCommand(
  prisma: PrismaService,
  options: { userId: string; email: string },
) {
  const verificationToken = generateTokenUtil();
  await prisma.auth.update({
    where: { userId: options.userId, email: options.email },
    data: { verificationToken },
  });
}
