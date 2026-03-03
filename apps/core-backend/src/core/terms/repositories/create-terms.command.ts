import { PrismaClient } from '@prisma/client';

export async function CreateTermsCommand(
  prisma: PrismaClient,
  data: { title: string; content: string; effectiveAt: Date },
) {
  const latest = await prisma.termsAndConditions.findFirst({
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  return prisma.termsAndConditions.create({
    data: {
      version: nextVersion,
      title: data.title,
      content: data.content,
      effectiveAt: data.effectiveAt,
    },
  });
}
