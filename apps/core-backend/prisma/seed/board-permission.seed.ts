import { PrismaClient } from '@prisma/client';
import { logSeedResult } from './seed-logger';

interface BoardResourcePermission {
  boardId: string;
  action: string;
  allowAnonymous: boolean;
  allowedGroupNames: string[];
}

/**
 * ResourcePermission 기반 게시판 권한 시드 헬퍼
 */
async function seedResourcePermission(
  prisma: PrismaClient,
  perm: BoardResourcePermission,
  boardName: string,
) {
  const existing = await prisma.resourcePermission.findUnique({
    where: {
      resourceType_resourceId_action: {
        resourceType: 'board',
        resourceId: perm.boardId,
        action: perm.action,
      },
    },
  });

  if (existing) {
    logSeedResult(
      'ResourcePermission',
      `${boardName} - ${perm.action}`,
      'exists',
    );
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

  // allowedGroups 연결
  if (perm.allowedGroupNames.length > 0) {
    const groups = await prisma.permissionGroup.findMany({
      where: { name: { in: perm.allowedGroupNames } },
      select: { id: true },
    });

    for (const group of groups) {
      await prisma.resourcePermissionAllowedGroup.create({
        data: {
          resourcePermissionId: resourcePermission.id,
          permissionGroupId: group.id,
        },
      });
    }
  }

  logSeedResult(
    'ResourcePermission',
    `${boardName} - ${perm.action}`,
    'created',
  );
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
