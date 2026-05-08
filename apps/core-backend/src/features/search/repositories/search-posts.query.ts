import { Prisma, PrismaClient } from '@prisma/client';

/**
 * tsquery로 매칭되는 게시글 ID 목록을 rank 순으로 페이지 단위로 반환.
 *
 * 호출자는 반환된 ID들을 board.post.findMany로 join + DTO 변환해야 한다
 * (관계 데이터 보존 목적).
 */
export async function SearchPostIdsQuery(
  prisma: PrismaClient,
  query: string,
  boardId: string | undefined,
  skip: number,
  limit: number,
): Promise<{ id: string }[]> {
  return prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT
        p.id,
        ts_rank(
          to_tsvector('simple', p.title || ' ' || p.content),
          to_tsquery('simple', ${query})
        ) as rank
      FROM "posts" p
      WHERE
        to_tsvector('simple', p.title || ' ' || p.content) @@ to_tsquery('simple', ${query})
        AND p.status = 'PUBLISHED'
        AND p."isSecret" = false
        ${boardId ? Prisma.sql`AND p."boardId" = ${boardId}` : Prisma.empty}
      ORDER BY
        p."isPinned" DESC,
        p.priority DESC,
        rank DESC,
        p."viewCount" DESC,
        p."createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `,
  );
}

export async function CountPostMatchesQuery(
  prisma: PrismaClient,
  query: string,
  boardId: string | undefined,
): Promise<number> {
  const result = await prisma.$queryRaw<{ count: bigint }[]>(
    Prisma.sql`
      SELECT COUNT(*) as count
      FROM "posts" p
      WHERE
        to_tsvector('simple', p.title || ' ' || p.content) @@ to_tsquery('simple', ${query})
        AND p.status = 'PUBLISHED'
        AND p."isSecret" = false
        ${boardId ? Prisma.sql`AND p."boardId" = ${boardId}` : Prisma.empty}
    `,
  );
  return Number(result[0].count);
}
