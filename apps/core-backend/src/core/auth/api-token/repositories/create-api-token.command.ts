import { PrismaClient } from '@weaver2/prisma';
import { API_TOKEN_SELECT } from './api-token.select';

export async function CreateApiTokenCommand(
  prisma: PrismaClient,
  data: {
    userId: string;
    name: string;
    prefix: string;
    tokenHash: string;
    scopes: string[];
    expiresAt: Date | null;
    issuedById: string;
  },
) {
  return prisma.apiToken.create({ data, select: API_TOKEN_SELECT });
}
