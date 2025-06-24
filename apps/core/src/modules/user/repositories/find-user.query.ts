import { User } from '@prisma/client';
import { PrismaService } from '@weaver2/prisma';
import { PaginationService } from '@weaver2/pagination';
import { PaginationResponseDto } from '@weaver2/pagination/dto/pagination-response.dto';
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
): Promise<PaginationResponseDto<User>> {
  return PaginationService.buildFromPrisma({
    prisma: prisma.user,
    options,
    where: {
      // deletedAt: null,
    },
  });
}
