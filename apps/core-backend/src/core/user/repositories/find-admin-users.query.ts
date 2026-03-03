import { PrismaService } from '@weaver2/prisma';
import {
  OffsetPaginationService,
  OffsetResponseDto,
} from '@weaver2/pagination';
import {
  AdminUsersQueryDto,
  UserStatusFilter,
} from '../dto/admin-users-query.dto';
import { Prisma } from '@prisma/client';

export type AdminUserWithGroups = Prisma.UserGetPayload<{
  include: {
    permissionGroups: {
      include: { permissionGroup: true };
    };
  };
}>;

export async function findAdminUsersQuery(
  prisma: PrismaService,
  options: AdminUsersQueryDto,
): Promise<OffsetResponseDto<AdminUserWithGroups>> {
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
          { email: { contains: options.search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const dateConditions: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (options.createdFrom || options.createdTo) {
    dateConditions.createdAt = {};
    if (options.createdFrom) {
      dateConditions.createdAt.gte = new Date(
        `${options.createdFrom}T00:00:00.000Z`,
      );
    }
    if (options.createdTo) {
      dateConditions.createdAt.lte = new Date(
        `${options.createdTo}T23:59:59.999Z`,
      );
    }
  }

  const statusConditions = buildStatusConditions(options.status);

  return OffsetPaginationService.buildFromPrisma({
    prisma: prisma.user as any, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    options,
    where: {
      ...searchConditions,
      ...dateConditions,
      ...statusConditions,
    },
    include: {
      permissionGroups: {
        include: { permissionGroup: true },
      },
    },
  });
}

function buildStatusConditions(status?: UserStatusFilter) {
  const now = new Date();
  switch (status) {
    case UserStatusFilter.ACTIVE:
      return {
        deletedAt: null,
        OR: [{ suspendedUntil: null }, { suspendedUntil: { lte: now } }],
      };
    case UserStatusFilter.SUSPENDED:
      return { deletedAt: null, suspendedUntil: { gt: now } };
    case UserStatusFilter.DELETED:
      return { deletedAt: { not: null } };
    default:
      return {};
  }
}
