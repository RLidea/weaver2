import { Prisma, PrismaClient } from '@weaver2/prisma';

/**
 * 검색 대상 글의 조건 — 게시됨·안 가림·안 지움, 읽을 수 있는 게시판(호출자가 PostReadPolicy 로 구한다),
 * 비밀글은 통째로 뺀다(작성자·관리자에게도 검색으로는 내지 않는다).
 */
export function searchablePost(boardIds: string[]): Prisma.Sql {
  return Prisma.sql`
    p.status = 'PUBLISHED'
    AND p."deletedAt" IS NULL
    AND p."hiddenAt" IS NULL
    AND p."isSecret" = false
    AND p."boardId" IN (${Prisma.join(boardIds)})`;
}

/**
 * tsquery로 매칭되는 게시글 ID 목록을 rank 순으로 페이지 단위로 반환.
 *
 * 호출자는 반환된 ID들을 board.post.findMany로 join + DTO 변환해야 한다
 * (관계 데이터 보존 목적).
 */
export async function SearchPostIdsQuery(
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
        p.id,
        ts_rank(
          to_tsvector('simple', p.title || ' ' || p.content),
          to_tsquery('simple', ${query})
        ) as rank
      FROM "posts" p
      WHERE
        to_tsvector('simple', p.title || ' ' || p.content) @@ to_tsquery('simple', ${query})
        AND ${searchablePost(boardIds)}
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
  boardIds: string[],
): Promise<number> {
  if (boardIds.length === 0) return 0;
  const result = await prisma.$queryRaw<{ count: bigint }[]>(
    Prisma.sql`
      SELECT COUNT(*) as count
      FROM "posts" p
      WHERE
        to_tsvector('simple', p.title || ' ' || p.content) @@ to_tsquery('simple', ${query})
        AND ${searchablePost(boardIds)}
    `,
  );
  return Number(result[0].count);
}
