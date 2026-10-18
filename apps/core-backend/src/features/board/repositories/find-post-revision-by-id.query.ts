import { Prisma, PrismaClient } from '@weaver2/prisma';
import { POST_REVISION_ACTOR_SELECT } from './find-post-revisions.query';

type Db = PrismaClient | Prisma.TransactionClient;

export async function FindPostRevisionByIdQuery(prisma: Db, id: string) {
  return prisma.postRevision.findUnique({
    where: { id },
    include: { actorUser: POST_REVISION_ACTOR_SELECT },
  });
}
