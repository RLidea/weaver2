import { PrismaClient } from '@prisma/client';
import { logSeedResult } from './seed-logger';

interface BoardResourcePermission {
  boardId: string;
  action: string;
  allowAnonymous: boolean;
  allowedGroupNames: string[];
}

/**
 * 그룹 이름을 id 로 바꾼다. 없는 이름은 **조용히 넘기지 않고 로그로 남긴다** —
 * 그룹 이름이 바뀌었는데 시드만 옛 이름을 들고 있으면, 허용 그룹이 하나도 없는
 * 규칙이 만들어져 "로그인만 하면 통과" 로 조용히 넓어진다.
 */
async function resolveGroupIds(
  prisma: PrismaClient,
  names: string[],
  label: string,
): Promise<string[]> {
  if (names.length === 0) {
    return [];
  }

  const groups = await prisma.permissionGroup.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  });

  const found = new Set(groups.map((g) => g.name));
  const missing = names.filter((name) => !found.has(name));
  if (missing.length > 0) {
    logSeedResult(
      'ResourcePermission',
      `${label} 허용그룹 ${missing.join('·')}`,
      'skipped',
      '그런 이름의 권한 그룹이 없다',
    );
  }

  return groups.map((g) => g.id);
}

/**
 * 규칙 하나의 허용 그룹을 목표 상태에 맞춘다. 바뀐 것이 있으면 `true`.
 *
 * **없는 것을 더하는 것만으로는 부족하다.** 빠진 그룹을 지우지 않으면 시드에서
 * 걷어낸 그룹이 DB에 계속 남아, 코드는 좁혔는데 실제 권한은 그대로가 된다.
 */
async function syncAllowedGroups(
  prisma: PrismaClient,
  resourcePermissionId: string,
  targetGroupIds: string[],
): Promise<boolean> {
  const existing = await prisma.resourcePermissionAllowedGroup.findMany({
    where: { resourcePermissionId },
    select: { permissionGroupId: true },
  });

  const have = new Set(existing.map((e) => e.permissionGroupId));
  const want = new Set(targetGroupIds);

  const toAdd = targetGroupIds.filter((id) => !have.has(id));
  const toRemove = [...have].filter((id) => !want.has(id));

  for (const permissionGroupId of toAdd) {
    await prisma.resourcePermissionAllowedGroup.create({
      data: { resourcePermissionId, permissionGroupId },
    });
  }

  if (toRemove.length > 0) {
    await prisma.resourcePermissionAllowedGroup.deleteMany({
      where: { resourcePermissionId, permissionGroupId: { in: toRemove } },
    });
  }

  return toAdd.length > 0 || toRemove.length > 0;
}

/**
 * ResourcePermission 기반 게시판 권한 시드 헬퍼
 */
async function seedResourcePermission(
  prisma: PrismaClient,
  perm: BoardResourcePermission,
  boardName: string,
) {
  const label = `${boardName} - ${perm.action}`;

  const existing = await prisma.resourcePermission.findUnique({
    where: {
      resourceType_resourceId_action: {
        resourceType: 'board',
        resourceId: perm.boardId,
        action: perm.action,
      },
    },
  });

  const targetGroupIds = await resolveGroupIds(
    prisma,
    perm.allowedGroupNames,
    label,
  );

  if (existing) {
    // 기존 규칙도 **고쳐 쓴다.** 없을 때만 만들면, 이미 깔린 DB 는 시드를 아무리
    // 다시 돌려도 옛 상태로 남는다 — 열어둔 `allowAnonymous: true` 나 걷어낸 그룹이
    // 그렇게 살아남는다. "고쳤는데 안 닫힌다" 는 사고는 이렇게 난다.
    const anonymousChanged = existing.allowAnonymous !== perm.allowAnonymous;
    if (anonymousChanged) {
      await prisma.resourcePermission.update({
        where: { id: existing.id },
        data: { allowAnonymous: perm.allowAnonymous },
      });
    }

    const groupsChanged = await syncAllowedGroups(
      prisma,
      existing.id,
      targetGroupIds,
    );

    if (anonymousChanged || groupsChanged) {
      const what = [
        anonymousChanged
          ? `익명 ${perm.allowAnonymous ? '허용' : '차단'}`
          : null,
        groupsChanged ? '허용그룹' : null,
      ]
        .filter(Boolean)
        .join(', ');
      logSeedResult('ResourcePermission', `${label} (${what})`, 'updated');
      return;
    }

    logSeedResult('ResourcePermission', label, 'exists');
    return;
  }

  const resourcePermission = await prisma.resourcePermission.create({
    data: {
      resourceType: 'board',
      resourceId: perm.boardId,
      action: perm.action,
      allowAnonymous: perm.allowAnonymous,
    },
  });

  await syncAllowedGroups(prisma, resourcePermission.id, targetGroupIds);

  logSeedResult('ResourcePermission', label, 'created');
}

export async function seedBoardPermissions(prisma: PrismaClient) {
  const noticeBoard = await prisma.board.findUnique({
    where: { name: 'Notice' },
  });
  const freeBoard = await prisma.board.findUnique({ where: { name: 'Free' } });
  const qaBoard = await prisma.board.findUnique({ where: { name: 'Q&A' } });

  if (!noticeBoard || !freeBoard || !qaBoard) {
    console.warn('Some boards not found, skipping board permission seeding');
    return;
  }

  // Notice 게시판 (공지사항 - 읽기는 모두, 쓰기는 관리자만)
  const noticePermissions: BoardResourcePermission[] = [
    {
      boardId: noticeBoard.id,
      action: 'read',
      allowAnonymous: true,
      allowedGroupNames: [],
    },
    {
      boardId: noticeBoard.id,
      action: 'write',
      allowAnonymous: false,
      allowedGroupNames: ['Admin'],
    },
    {
      boardId: noticeBoard.id,
      action: 'edit_all',
      allowAnonymous: false,
      allowedGroupNames: ['Admin'],
    },
    {
      boardId: noticeBoard.id,
      action: 'delete_all',
      allowAnonymous: false,
      allowedGroupNames: ['Admin'],
    },
    // 본인 글 수정·삭제. `edit_all` 이 있으니 없어도 된다고 보면 틀린다 —
    // `canEdit`/`canDelete` 는 작성자 본인이면 `*_OWN` 만 보고 끝낸다.
    // 이 두 줄이 없으면 공지를 쓴 관리자가 자기 공지를 못 고친다.
    {
      boardId: noticeBoard.id,
      action: 'edit_own',
      allowAnonymous: false,
      allowedGroupNames: [],
    },
    {
      boardId: noticeBoard.id,
      action: 'delete_own',
      allowAnonymous: false,
      allowedGroupNames: [],
    },
    {
      boardId: noticeBoard.id,
      action: 'comment',
      allowAnonymous: false,
      allowedGroupNames: [],
    },
  ];

  // Free 게시판 (자유게시판 - 모든 작업 허용)
  const freePermissions: BoardResourcePermission[] = [
    {
      boardId: freeBoard.id,
      action: 'read',
      allowAnonymous: true,
      allowedGroupNames: [],
    },
    {
      boardId: freeBoard.id,
      action: 'write',
      allowAnonymous: true,
      allowedGroupNames: [],
    },
    {
      boardId: freeBoard.id,
      action: 'edit_own',
      allowAnonymous: true,
      allowedGroupNames: [],
    },
    {
      boardId: freeBoard.id,
      action: 'delete_own',
      allowAnonymous: true,
      allowedGroupNames: [],
    },
    {
      boardId: freeBoard.id,
      action: 'comment',
      allowAnonymous: true,
      allowedGroupNames: [],
    },
    {
      boardId: freeBoard.id,
      action: 'edit_all',
      allowAnonymous: false,
      allowedGroupNames: ['Moderator', 'Admin'],
    },
    {
      boardId: freeBoard.id,
      action: 'delete_all',
      allowAnonymous: false,
      allowedGroupNames: ['Admin'],
    },
  ];

  // Q&A 게시판 (회원만 이용 가능)
  const qaPermissions: BoardResourcePermission[] = [
    {
      boardId: qaBoard.id,
      action: 'read',
      allowAnonymous: false,
      allowedGroupNames: [],
    },
    {
      boardId: qaBoard.id,
      action: 'write',
      allowAnonymous: false,
      allowedGroupNames: [],
    },
    {
      boardId: qaBoard.id,
      action: 'edit_own',
      allowAnonymous: false,
      allowedGroupNames: [],
    },
    {
      boardId: qaBoard.id,
      action: 'delete_own',
      allowAnonymous: false,
      allowedGroupNames: [],
    },
    {
      boardId: qaBoard.id,
      action: 'comment',
      allowAnonymous: false,
      allowedGroupNames: [],
    },
    {
      boardId: qaBoard.id,
      action: 'edit_all',
      allowAnonymous: false,
      allowedGroupNames: ['Moderator', 'Admin'],
    },
    {
      boardId: qaBoard.id,
      action: 'delete_all',
      allowAnonymous: false,
      allowedGroupNames: ['Admin'],
    },
  ];

  const seedMap: [BoardResourcePermission[], string][] = [
    [noticePermissions, noticeBoard.name],
    [freePermissions, freeBoard.name],
    [qaPermissions, qaBoard.name],
  ];

  for (const [permissions, boardName] of seedMap) {
    for (const perm of permissions) {
      await seedResourcePermission(prisma, perm, boardName);
    }
  }
}
