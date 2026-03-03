import { User } from '@prisma/client';
import { PrismaService } from '@weaver2/prisma';
import { OffsetPaginationService } from '@weaver2/pagination';
import { OffsetResponseDto } from '@weaver2/pagination';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';

/**
 * 제공된 기준에 따라 사용자를 검색하고 페이지네이션을 적용합니다.
 * 이 함수는 Prisma 클라이언트 인스턴스를 주입받아 동작합니다.
 * @param prisma - Prisma 서비스 인스턴스
 * @param options - 사용자 검색을 위한 쿼리 옵션
 * @returns 페이지네이션이 적용된 사용자 목록
 */
export async function findUserQuery(
  prisma: PrismaService,
  options: PaginationRequestDto,
): Promise<OffsetResponseDto<User>> {
  // Build search conditions if search parameter exists
  const searchConditions = options.search
    ? {
        OR: [
          {
            username: {
              contains: options.search,
              mode: 'insensitive' as const,
            },
          },
          {
            displayName: {
              contains: options.search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }
    : {};

  // Build date range conditions for createdAt
  const dateConditions: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (options.createdFrom || options.createdTo) {
    dateConditions.createdAt = {};

    if (options.createdFrom) {
      // Start of the day (00:00:00)
      dateConditions.createdAt.gte = new Date(
        `${options.createdFrom}T00:00:00.000Z`,
      );
    }

    if (options.createdTo) {
      // End of the day (23:59:59.999)
      dateConditions.createdAt.lte = new Date(
        `${options.createdTo}T23:59:59.999Z`,
      );
    }
  }

  return OffsetPaginationService.buildFromPrisma({
    prisma: prisma.user,
    options,
    where: {
      // deletedAt: null,
      ...searchConditions,
      ...dateConditions,
    },
  });
}
