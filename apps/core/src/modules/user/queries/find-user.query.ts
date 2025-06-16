import { Users } from '@prisma/client';
import { PrismaService } from '@weaver2/prisma';
import { FindUsersDto } from './dto/find-users.dto';

/**
 * 페이지네이션된 결과에 대한 데이터 전송 객체입니다.
 * @template T 데이터 아이템의 타입
 */
export class PaginatedDto<T> {
  total: number;
  page: number;
  limit: number;
  data: T[];
}

/**
 * 제공된 기준에 따라 사용자를 검색하고 페이지네이션을 적용합니다.
 * 이 함수는 Prisma 클라이언트 인스턴스를 주입받아 동작합니다.
 * @param prisma - Prisma 서비스 인스턴스
 * @param options - 사용자 검색을 위한 쿼리 옵션
 * @returns 페이지네이션이 적용된 사용자 목록
 */
export async function findUserQuery(
  prisma: PrismaService,
  options: FindUsersDto,
): Promise<PaginatedDto<Users>> {
  const { page, limit, role } = options;
  const skip = (page - 1) * limit;

  const where = role ? { role } : {};

  const [users, total] = await Promise.all([
    prisma.users.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.users.count({ where }),
  ]);

  return {
    total,
    page,
    limit,
    data: users,
  };
}
