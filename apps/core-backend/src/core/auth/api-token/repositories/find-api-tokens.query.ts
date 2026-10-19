import { PrismaClient } from '@weaver2/prisma';
import { API_TOKEN_SELECT } from './api-token.select';

/** 한 앱의 토큰은 수십 개 단위다. 상한을 넘기면 그때 쪽을 나눈다 */
const API_TOKEN_LIST_LIMIT = 200;

export async function FindApiTokensQuery(
  prisma: PrismaClient,
  filter: { userId?: string },
) {
  return prisma.apiToken.findMany({
    where: { userId: filter.userId },
    orderBy: { createdAt: 'desc' },
    take: API_TOKEN_LIST_LIMIT,
    select: API_TOKEN_SELECT,
  });
}
