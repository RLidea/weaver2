import { PrismaClient } from '@prisma/client';

export async function CreateUserTermsAgreementCommand(
  prisma: PrismaClient,
  data: { userId: string; termsAndConditionsId: string }[],
) {
  return prisma.userTermsAgreement.createMany({
    data,
  });
}
