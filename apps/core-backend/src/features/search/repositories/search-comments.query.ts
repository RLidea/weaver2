import { Prisma, PrismaClient } from '@prisma/client';

export async function SearchCommentIdsQuery(
  prisma: PrismaClient,
  query: string,
  boardId: string | undefined,
  skip: number,
  limit: number,
): Promise<{ id: string }[]> {
  return prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT
        c.id,
        ts_rank(
          to_tsvector('simple', c.content),
          to_tsquery('simple', ${query})
        ) as rank
      FROM "comments" c
      ${boardId ? Prisma.sql`JOIN "posts" p ON c."postId" = p.id` : Prisma.empty}
      WHERE
        to_tsvector('simple', c.content) @@ to_tsquery('simple', ${query})
        ${boardId ? Prisma.sql`AND p."boardId" = ${boardId}` : Prisma.empty}
      ORDER BY
        rank DESC,
        c."createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `,
  );
}

export async function CountCommentMatchesQuery(
  prisma: PrismaClient,
  query: string,
  boardId: string | undefined,
): Promise<number> {
  const result = await prisma.$queryRaw<{ count: bigint }[]>(
    Prisma.sql`
      SELECT COUNT(*) as count
      FROM "comments" c
      ${boardId ? Prisma.sql`JOIN "posts" p ON c."postId" = p.id` : Prisma.empty}
      WHERE
        to_tsvector('simple', c.content) @@ to_tsquery('simple', ${query})
        ${boardId ? Prisma.sql`AND p."boardId" = ${boardId}` : Prisma.empty}
    `,
  );
  return Number(result[0].count);
}
