import { PrismaClient } from '@prisma/client';
import { logSeedResult } from './seed-logger';

interface UserGroupAssignment {
  username: string;
  groupName: string;
}

const assignmentsToSeed: UserGroupAssignment[] = [
  { username: 'weaver', groupName: 'SuperAdmin' },
  { username: 'admin', groupName: 'Admin' },
  { username: 'operator', groupName: 'Operator' },
  { username: 'moderator', groupName: 'Moderator' },
  { username: 'suspended', groupName: 'Suspended' },
  { username: 'user', groupName: 'User' },
];

export async function seedUserPermissionGroups(prisma: PrismaClient) {
  for (const assignment of assignmentsToSeed) {
    const user = await prisma.user.findUnique({
      where: { username: assignment.username },
    });

    if (!user) {
      logSeedResult(
        'UserPermissionGroup',
        `${assignment.username} → ${assignment.groupName}`,
        'skipped',
        'user not found',
      );
      continue;
    }

    const group = await prisma.permissionGroup.findUnique({
      where: { name: assignment.groupName },
    });

    if (!group) {
      logSeedResult(
        'UserPermissionGroup',
        `${assignment.username} → ${assignment.groupName}`,
        'skipped',
        'group not found',
      );
      continue;
    }

    const existing = await prisma.userPermissionGroup.findUnique({
      where: {
        userId_permissionGroupId: {
          userId: user.id,
          permissionGroupId: group.id,
        },
      },
    });

    if (existing) {
      logSeedResult(
        'UserPermissionGroup',
        `${assignment.username} → ${assignment.groupName}`,
        'exists',
      );
      continue;
    }

    await prisma.userPermissionGroup.create({
      data: {
        userId: user.id,
        permissionGroupId: group.id,
      },
    });

    logSeedResult(
      'UserPermissionGroup',
      `${assignment.username} → ${assignment.groupName}`,
      'created',
    );
  }
}
