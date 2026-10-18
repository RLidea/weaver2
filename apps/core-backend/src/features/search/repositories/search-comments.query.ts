import { Prisma, PrismaClient } from '@weaver2/prisma';
import { searchablePost } from './search-posts.query';

/** 지우거나 가린 댓글, 검색할 수 없는 글(searchablePost)에 달린 댓글은 찾지 않는다 */
function searchableComment(boardIds: string[]): Prisma.Sql {
  return Prisma.sql`
    c."deletedAt" IS NULL
    AND c."hiddenAt" IS NULL
    AND ${searchablePost(boardIds)}`;
}

export async function SearchCommentIdsQuery(
  prisma: PrismaClient,
  query: string,
  boardIds: string[],
  skip: number,
  limit: number,
): Promise<{ id: string }[]> {
  if (boardIds.length === 0) return [];
  return prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT
        c.id,
        ts_rank(
          to_tsvector('simple', c.content),
          to_tsquery('simple', ${query})
        ) as rank
      FROM "comments" c
      JOIN "posts" p ON c."postId" = p.id
      WHERE
        to_tsvector('simple', c.content) @@ to_tsquery('simple', ${query})
        AND ${searchableComment(boardIds)}
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
  boardIds: string[],
): Promise<number> {
  if (boardIds.length === 0) return 0;
  const result = await prisma.$queryRaw<{ count: bigint }[]>(
    Prisma.sql`
      SELECT COUNT(*) as count
      FROM "comments" c
      JOIN "posts" p ON c."postId" = p.id
      WHERE
        to_tsvector('simple', c.content) @@ to_tsquery('simple', ${query})
        AND ${searchableComment(boardIds)}
    `,
  );
  return Number(result[0].count);
}
