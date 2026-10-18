/**
 * Admin Privilege Ceiling Integration Tests
 *
 * 「자기가 가진 것보다 넓은 권한은 남에게(자기 포함) 주지도, 넓은 사람에게 손대지도 못한다」를
 * 실제 DB·실제 권한 그룹(시드 정의의 Admin·SuperAdmin)으로 잰다. 막지 않으면 permission-group
 * 관리 권한을 가진 Admin 이 자기를 SuperAdmin 그룹에 넣어 모든 상하 검사를 돌아간다.
 */
import { PrismaService } from '@weaver2/prisma';
import {
  createTestApp,
  closeTestApp,
  getTestingModule,
} from './helpers/test-app.helper';
import { ensureSystemPermissionGroups } from './helpers/permission-group.helper';
import { AdminPermissionApiService } from '../../src/system/admin/api/services/admin-permission.api.service';
import { UserAdminService } from '../../src/core/user/services/user-admin.service';
import { PermissionService } from '../../src/core/permission/services/permission.service';
import { DeleteAccountService } from '../../src/core/user/services/delete-account.service';

describe('Admin Privilege Ceiling (Integration)', () => {
  let prisma: PrismaService;
  let groups: AdminPermissionApiService;
  let users: UserAdminService;
  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];

  beforeAll(async () => {
    await createTestApp();
    prisma = getTestingModule().get(PrismaService);
    await ensureSystemPermissionGroups(prisma);
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

  describe('마지막 슈퍼관리자', () => {
    // 「마지막」인지는 DB 전체 상태에 달려 시험이 만들 수 없다(시드·다른 스위트의 슈퍼관리자가 있다).
    // 그래서 ① 가드가 실제 DB 에서 0명을 되돌리는지 ② 줄일 수 있는 경로가 전부 가드를 타는지를 잰다.

    it('가드 안에서 슈퍼관리자가 0명이 되면 409 와 함께 되돌린다 (실제 DB)', async () => {
      const permissions = getTestingModule().get(PermissionService);
      const superMembership = {
        permissionGroup: { permissions: { some: { permission: '*:*' } } },
      };
      // 전체 수를 앞뒤로 비교하지 않는다 — 병렬로 도는 다른 스위트가 슈퍼관리자를 만들고 지운다.
      // 이 시험이 만든 소속이 되돌림 뒤에도 살아 있는지를 본다
      const mine = await inGroup('SuperAdmin');

      await expect(
        permissions.withSuperAdminGuard((tx) =>
          tx.userPermissionGroup.deleteMany({ where: superMembership }),
        ),
      ).rejects.toThrow(/마지막 슈퍼관리자/);
      expect(
        await prisma.userPermissionGroup.count({
          where: { userId: mine.id, ...superMembership },
        }),
      ).toBe(1);
    });

    it('슈퍼관리자를 줄일 수 있는 경로는 전부 가드를 탄다', async () => {
      const permissions = getTestingModule().get(PermissionService);
      const guard = jest.spyOn(permissions, 'withSuperAdminGuard');
      const superAdmin = await inGroup('SuperAdmin');
      const target = await inGroup('SuperAdmin');
      const group = await prisma.permissionGroup.create({
        data: { name: `priv-guard-${Date.now()}` },
      });
      createdGroupIds.push(group.id);

      await groups.setGroupPermissions(superAdmin.id, group.id, {
        permissions: ['post:read'],
      });
      await groups.removeGroupPermissions(superAdmin.id, group.id, {
        permissions: ['post:read'],
      });
      await groups.removeUserFromGroup(
        superAdmin.id,
        await groupId('SuperAdmin'),
        target.id,
      );
      await getTestingModule().get(DeleteAccountService).execute(target.id);

      expect(guard).toHaveBeenCalledTimes(4);
      guard.mockRestore();
    });
  });
});
