import { Prisma, PrismaClient } from '@weaver2/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * 시도를 잡은 행을, 해시가 맞을 때만 지운다 — 비교와 소비가 한 문장이다.
 * 맞으면 { newEmail }, 틀리면 null.
 *
 * 조건에 secretHash 가 있어, 확인 도중 재발급이 끼어들어 행이 새 코드로 바뀌었으면
 * 옛 코드는 그 행을 지우지 못한다.
 */
export async function ConsumeOneTimeCodeCommand(
  prisma: Db,
  id: string,
  secretHash: string,
): Promise<{ newEmail: string | null } | null> {
  const rows = await prisma.$queryRaw<{ newEmail: string | null }[]>`
    DELETE FROM one_time_codes
     WHERE id = ${id} AND "secretHash" = ${secretHash}
    RETURNING "newEmail"`;
  return rows[0] ?? null;
}
