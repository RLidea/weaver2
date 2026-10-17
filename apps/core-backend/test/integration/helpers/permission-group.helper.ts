import { Prisma, PrismaClient } from '@weaver2/prisma';
import { permissionGroupsToSeed } from '../../../prisma/seed/permission-group.seed';

/**
 * 시스템 권한 그룹(Admin·SuperAdmin …)이 없으면 시드 정의대로 만든다.
 *
 * CI 통합 잡은 마이그레이션만 하고 시드를 돌리지 않는다. 그렇다고 시드의 동기화를 부르면
 * 공용 DB 를 문 레인에서 사람이 더한 권한까지 지운다 — 그래서 「없을 때만 만들기」다.
 *
 * 스위트가 병렬(maxWorkers)로 돌아 빈 DB 에 같은 그룹을 동시에 만든다. 진 쪽의 P2002 는
 * 「이미 누가 만들었다」이므로 넘어간다 — 그룹과 권한은 한 문장(중첩 create)으로 들어가
 * 그룹이 보이면 권한도 다 있다.
 */
export async function ensureSystemPermissionGroups(
  prisma: PrismaClient,
): Promise<void> {
  for (const group of permissionGroupsToSeed) {
    try {
      await prisma.permissionGroup.upsert({
        where: { name: group.name },
        update: {},
        create: {
          name: group.name,
          description: group.description,
          isSystem: group.isSystem,
          permissions: {
            create: group.permissions.map((permission) => ({ permission })),
          },
        },
      });
    } catch (err) {
      if (
        !(err instanceof Prisma.PrismaClientKnownRequestError) ||
        err.code !== 'P2002'
      ) {
        throw err;
      }
    }
  }
}
