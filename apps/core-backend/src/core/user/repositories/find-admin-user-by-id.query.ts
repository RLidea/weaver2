import { PrismaClient, Prisma } from '@prisma/client';

export type AdminUserDetail = Prisma.UserGetPayload<{
  include: {
    userSetting: true;
    permissionGroups: {
      include: { permissionGroup: true };
    };
  };
}>;

export async function FindAdminUserByIdQuery(
  prisma: PrismaClient,
  id: string,
): Promise<AdminUserDetail | null> {
  return prisma.user.findUnique({
    where: { id },
    include: {
      userSetting: true,
      permissionGroups: {
        include: { permissionGroup: true },
      },
    },
  });
}
