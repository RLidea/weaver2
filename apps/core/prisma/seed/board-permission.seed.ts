import { PrismaClient, ActionType, Role } from '@prisma/client';
import { logSeedResult } from './seed-logger';

export async function seedBoardPermissions(prisma: PrismaClient) {
  // Board 가져오기
  const noticeBoard = await prisma.board.findUnique({
    where: { name: 'Notice' },
  });
  const freeBoard = await prisma.board.findUnique({ where: { name: 'Free' } });
  const qaBoard = await prisma.board.findUnique({ where: { name: 'Q&A' } });

  if (!noticeBoard || !freeBoard || !qaBoard) {
    console.warn('Some boards not found, skipping board permission seeding');
    return;
  }

  // Notice 게시판 권한 (공지사항 - 읽기는 모두, 쓰기는 관리자만)
  const noticePermissions = [
    {
      boardId: noticeBoard.id,
      action: ActionType.READ,
      allowAnonymous: true,
      allowedRoles: [],
      allowedUserIds: [],
    },
    {
      boardId: noticeBoard.id,
      action: ActionType.WRITE,
      allowAnonymous: false,
      allowedRoles: [Role.ADMIN],
      allowedUserIds: [],
    },
    {
      boardId: noticeBoard.id,
      action: ActionType.EDIT_ALL,
      allowAnonymous: false,
      allowedRoles: [Role.ADMIN],
      allowedUserIds: [],
    },
    {
      boardId: noticeBoard.id,
      action: ActionType.DELETE_ALL,
      allowAnonymous: false,
      allowedRoles: [Role.ADMIN],
      allowedUserIds: [],
    },
    {
      boardId: noticeBoard.id,
      action: ActionType.COMMENT,
      allowAnonymous: false,
      allowedRoles: [Role.USER, Role.MODERATOR, Role.ADMIN],
      allowedUserIds: [],
    },
  ];

  // Free 게시판 권한 (자유게시판 - 모든 작업 허용)
  const freePermissions = [
    {
      boardId: freeBoard.id,
      action: ActionType.READ,
      allowAnonymous: true,
      allowedRoles: [],
      allowedUserIds: [],
    },
    {
      boardId: freeBoard.id,
      action: ActionType.WRITE,
      allowAnonymous: true,
      allowedRoles: [],
      allowedUserIds: [],
    },
    {
      boardId: freeBoard.id,
      action: ActionType.EDIT_OWN,
      allowAnonymous: true,
      allowedRoles: [],
      allowedUserIds: [],
    },
    {
      boardId: freeBoard.id,
      action: ActionType.DELETE_OWN,
      allowAnonymous: true,
      allowedRoles: [],
      allowedUserIds: [],
    },
    {
      boardId: freeBoard.id,
      action: ActionType.COMMENT,
      allowAnonymous: true,
      allowedRoles: [],
      allowedUserIds: [],
    },
    {
      boardId: freeBoard.id,
      action: ActionType.EDIT_ALL,
      allowAnonymous: false,
      allowedRoles: [Role.MODERATOR, Role.ADMIN],
      allowedUserIds: [],
    },
    {
      boardId: freeBoard.id,
      action: ActionType.DELETE_ALL,
      allowAnonymous: false,
      allowedRoles: [Role.ADMIN],
      allowedUserIds: [],
    },
  ];

  // Q&A 게시판 권한 (회원만 이용 가능)
  const qaPermissions = [
    {
      boardId: qaBoard.id,
      action: ActionType.READ,
      allowAnonymous: false,
      allowedRoles: [Role.USER, Role.MODERATOR, Role.ADMIN],
      allowedUserIds: [],
    },
    {
      boardId: qaBoard.id,
      action: ActionType.WRITE,
      allowAnonymous: false,
      allowedRoles: [Role.USER, Role.MODERATOR, Role.ADMIN],
      allowedUserIds: [],
    },
    {
      boardId: qaBoard.id,
      action: ActionType.EDIT_OWN,
      allowAnonymous: false,
      allowedRoles: [Role.USER, Role.MODERATOR, Role.ADMIN],
      allowedUserIds: [],
    },
    {
      boardId: qaBoard.id,
      action: ActionType.DELETE_OWN,
      allowAnonymous: false,
      allowedRoles: [Role.USER, Role.MODERATOR, Role.ADMIN],
      allowedUserIds: [],
    },
    {
      boardId: qaBoard.id,
      action: ActionType.COMMENT,
      allowAnonymous: false,
      allowedRoles: [Role.USER, Role.MODERATOR, Role.ADMIN],
      allowedUserIds: [],
    },
    {
      boardId: qaBoard.id,
      action: ActionType.EDIT_ALL,
      allowAnonymous: false,
      allowedRoles: [Role.MODERATOR, Role.ADMIN],
      allowedUserIds: [],
    },
    {
      boardId: qaBoard.id,
      action: ActionType.DELETE_ALL,
      allowAnonymous: false,
      allowedRoles: [Role.ADMIN],
      allowedUserIds: [],
    },
  ];

  // 모든 권한을 하나의 배열로 합치기
  const allPermissions = [
    ...noticePermissions,
    ...freePermissions,
    ...qaPermissions,
  ];

  // 권한 시드 실행
  for (const permission of allPermissions) {
    const existing = await prisma.boardPermission.findUnique({
      where: {
        boardId_action: {
          boardId: permission.boardId,
          action: permission.action,
        },
      },
    });

    if (existing) {
      const boardName = [noticeBoard, freeBoard, qaBoard].find(
        (b) => b.id === permission.boardId,
      )?.name;
      logSeedResult(
        'BoardPermission',
        `${boardName} - ${permission.action}`,
        'exists',
      );
    } else {
      await prisma.boardPermission.create({
        data: permission,
      });
      const boardName = [noticeBoard, freeBoard, qaBoard].find(
        (b) => b.id === permission.boardId,
      )?.name;
      logSeedResult(
        'BoardPermission',
        `${boardName} - ${permission.action}`,
        'created',
      );
    }
  }
}
