import { PrismaClient } from '@weaver2/prisma';

export async function CreateUserTermsAgreementCommand(
  prisma: PrismaClient,
  data: { userId: string; termsAndConditionsId: string }[],
) {
  return prisma.userTermsAgreement.createMany({
    data,
  });
}
