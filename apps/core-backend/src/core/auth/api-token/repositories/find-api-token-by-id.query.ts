import { PrismaClient } from '@weaver2/prisma';
import { API_TOKEN_SELECT } from './api-token.select';

export async function FindApiTokenByIdQuery(prisma: PrismaClient, id: string) {
  return prisma.apiToken.findUnique({
    where: { id },
    select: API_TOKEN_SELECT,
  });
}
