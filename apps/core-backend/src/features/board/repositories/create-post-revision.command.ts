import { Prisma, PrismaClient, PostRevisionActorKind } from '@weaver2/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

export async function CreatePostRevisionCommand(
  prisma: Db,
  data: {
    postId: string;
    title: string;
    content: string;
    actorUserId: string | null;
    actorKind: PostRevisionActorKind;
  },
) {
  return prisma.postRevision.create({ data });
}
