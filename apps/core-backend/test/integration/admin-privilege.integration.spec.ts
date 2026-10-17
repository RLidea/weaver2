/**
 * Admin Privilege Ceiling Integration Tests
 *
 * 「자기가 가진 것보다 넓은 권한은 남에게(자기 포함) 주지도, 넓은 사람에게 손대지도 못한다」를
 * 실제 DB·실제 권한 그룹(시드의 Admin·SuperAdmin)으로 잰다. 막지 않으면 permission-group
 * 관리 권한을 가진 Admin 이 자기를 SuperAdmin 그룹에 넣어 모든 상하 검사를 돌아간다.
 */
import { PrismaService } from '@weaver2/prisma';
import {
  createTestApp,
  closeTestApp,
  getTestingModule,
} from './helpers/test-app.helper';
import { AdminPermissionApiService } from '../../src/system/admin/api/services/admin-permission.api.service';
import { UserAdminService } from '../../src/core/user/services/user-admin.service';
import { PermissionService } from '../../src/core/permission/services/permission.service';

describe('Admin Privilege Ceiling (Integration)', () => {
  let prisma: PrismaService;
  let groups: AdminPermissionApiService;
  let users: UserAdminService;
  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];

  beforeAll(async () => {
    await createTestApp();
    prisma = getTestingModule().get(PrismaService);
    groups = getTestingModule().get(AdminPermissionApiService);
    users = getTestingModule().get(UserAdminService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.permissionGroup.deleteMany({
      where: { id: { in: createdGroupIds } },
    });
    await closeTestApp();
  });

  async function createUser() {
    const name = `priv_${Date.now()}_${createdUserIds.length}`;
    const user = await prisma.user.create({
      data: {
        email: `${name}@integration-test.local`,
        username: name,
        displayName: name,
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  async function groupId(name: string) {
    return (await prisma.permissionGroup.findUniqueOrThrow({ where: { name } }))
      .id;
  }

  async function inGroup(name: string) {
    const user = await createUser();
    await prisma.userPermissionGroup.create({
      data: { userId: user.id, permissionGroupId: await groupId(name) },
    });
    return user;
  }

  it('Admin 은 자기를 SuperAdmin 그룹에 넣지 못한다', async () => {
    const admin = await inGroup('Admin');

    await expect(
      groups.assignUsersToGroup(admin.id, await groupId('SuperAdmin'), {
        userIds: [admin.id],
      }),
    ).rejects.toThrow(/갖지 않은 권한/);
    expect(
      await getTestingModule()
        .get(PermissionService)
        .hasPermission(admin.id, '*:*'),
    ).toBe(false);
  });

  it('Admin 은 자기 그룹에 *:* 를 더하지 못하고, SuperAdmin 그룹의 권한을 빼지도 못한다', async () => {
    const admin = await inGroup('Admin');
    const adminGroupId = await groupId('Admin');
    const before = await prisma.permissionGroupPermission.count({
      where: { permissionGroupId: adminGroupId },
    });

    await expect(
      groups.setGroupPermissions(admin.id, adminGroupId, {
        permissions: ['*:*'],
      }),
    ).rejects.toThrow(/갖지 않은 권한/);
    await expect(
      groups.removeGroupPermissions(admin.id, await groupId('SuperAdmin'), {
        permissions: ['*:*'],
      }),
    ).rejects.toThrow(/갖지 않은 권한/);

    expect(
      await prisma.permissionGroupPermission.count({
        where: { permissionGroupId: adminGroupId },
      }),
    ).toBe(before);
  });

  it('Admin 은 SuperAdmin 을 SuperAdmin 그룹에서 빼지 못한다', async () => {
    const admin = await inGroup('Admin');
    const superAdmin = await inGroup('SuperAdmin');

    await expect(
      groups.removeUserFromGroup(
        admin.id,
        await groupId('SuperAdmin'),
        superAdmin.id,
      ),
    ).rejects.toThrow(/갖지 않은 권한/);
  });

  it('Admin 은 자기가 가진 권한 안의 그룹은 다룰 수 있다', async () => {
    const admin = await inGroup('Admin');
    const target = await createUser();
    const group = await prisma.permissionGroup.create({
      data: { name: `priv-group-${Date.now()}` },
    });
    createdGroupIds.push(group.id);

    await groups.setGroupPermissions(admin.id, group.id, {
      permissions: ['post:read', 'user:read'],
    });
    await expect(
      groups.assignUsersToGroup(admin.id, group.id, { userIds: [target.id] }),
    ).resolves.toMatchObject({ assigned: 1 });
  });

  it('SuperAdmin 은 누구든 SuperAdmin 그룹에 넣을 수 있다', async () => {
    const superAdmin = await inGroup('SuperAdmin');
    const target = await createUser();

    await expect(
      groups.assignUsersToGroup(superAdmin.id, await groupId('SuperAdmin'), {
        userIds: [target.id],
      }),
    ).resolves.toMatchObject({ assigned: 1 });
  });

  it('Admin 은 SuperAdmin 을 정지·삭제하지 못한다', async () => {
    const admin = await inGroup('Admin');
    const superAdmin = await inGroup('SuperAdmin');

    await expect(
      users.suspendUser(admin.id, superAdmin.id, {}),
    ).rejects.toThrow(/권한이 넓은/);
    await expect(users.deleteUser(admin.id, superAdmin.id)).rejects.toThrow(
      /권한이 넓은/,
    );
    const after = await prisma.user.findUniqueOrThrow({
      where: { id: superAdmin.id },
    });
    expect(after.suspendedUntil).toBeNull();
    expect(after.deletedAt).toBeNull();
  });
});
