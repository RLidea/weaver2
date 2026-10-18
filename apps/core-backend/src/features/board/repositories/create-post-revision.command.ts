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
  // 순서가 넣은 때를 따르도록 시각을 여기서 박는다 (DB 기본값은 트랜잭션 시작 시각일 수 있다)
  return prisma.postRevision.create({
    data: { ...data, createdAt: new Date() },
  });
}
