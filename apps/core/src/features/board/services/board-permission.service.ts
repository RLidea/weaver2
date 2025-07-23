import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { ActionType, Role } from '@prisma/client';
import { CommonAuthUserDto } from '@weaver2/common';

@Injectable()
export class BoardPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async canPerformAction(
    boardId: string,
    action: ActionType,
    user?: CommonAuthUserDto,
  ): Promise<boolean> {
    const permission = await this.prisma.boardPermission.findUnique({
      where: { boardId_action: { boardId, action } },
    });

    if (!permission) {
      // 권한 설정이 없으면 기본적으로 거부
      return false;
    }

    // 비로그인 사용자 체크
    if (!user?.isLogin) {
      return permission.allowAnonymous;
    }

    // 로그인 사용자 체크
    return (
      permission.allowAnonymous || // 익명 허용이면 당연히 로그인 사용자도 허용
      permission.allowedRoles.includes(user.role as Role) ||
      permission.allowedUserIds.includes(user.id)
    );
  }

  async canEdit(
    item: { authorId: string; boardId: string },
    user?: CommonAuthUserDto,
  ): Promise<boolean> {
    if (!user?.isLogin) {
      return this.canPerformAction(item.boardId, ActionType.EDIT_OWN, user);
    }

    // 본인 글인 경우
    if (item.authorId === user.id) {
      return this.canPerformAction(item.boardId, ActionType.EDIT_OWN, user);
    }

    // 다른 사람 글인 경우
    return this.canPerformAction(item.boardId, ActionType.EDIT_ALL, user);
  }

  async canDelete(
    item: { authorId: string; boardId: string },
    user?: CommonAuthUserDto,
  ): Promise<boolean> {
    if (!user?.isLogin) {
      return this.canPerformAction(item.boardId, ActionType.DELETE_OWN, user);
    }

    // 본인 글인 경우
    if (item.authorId === user.id) {
      return this.canPerformAction(item.boardId, ActionType.DELETE_OWN, user);
    }

    // 다른 사람 글인 경우
    return this.canPerformAction(item.boardId, ActionType.DELETE_ALL, user);
  }

  async requirePermission(
    boardId: string,
    action: ActionType,
    user?: CommonAuthUserDto,
    errorMessage?: string,
  ): Promise<void> {
    const hasPermission = await this.canPerformAction(boardId, action, user);
    if (!hasPermission) {
      throw new ForbiddenException(
        errorMessage || `${action} 권한이 없습니다.`,
      );
    }
  }

  async requireEditPermission(
    item: { authorId: string; boardId: string },
    user?: CommonAuthUserDto,
  ): Promise<void> {
    const canEdit = await this.canEdit(item, user);
    if (!canEdit) {
      throw new ForbiddenException('수정 권한이 없습니다.');
    }
  }

  async requireDeletePermission(
    item: { authorId: string; boardId: string },
    user?: CommonAuthUserDto,
  ): Promise<void> {
    const canDelete = await this.canDelete(item, user);
    if (!canDelete) {
      throw new ForbiddenException('삭제 권한이 없습니다.');
    }
  }

  // 기본 권한 설정을 생성하는 유틸리티 메서드
  async createDefaultPermissions(boardId: string): Promise<void> {
    const defaultPermissions = [
      // 공개 게시판 기본 설정
      { boardId, action: ActionType.READ, allowAnonymous: true },
      { boardId, action: ActionType.WRITE, allowAnonymous: true },
      { boardId, action: ActionType.EDIT_OWN, allowAnonymous: true },
      { boardId, action: ActionType.DELETE_OWN, allowAnonymous: true },
      { boardId, action: ActionType.COMMENT, allowAnonymous: true },
      {
        boardId,
        action: ActionType.EDIT_ALL,
        allowedRoles: [Role.MODERATOR, Role.ADMIN],
      },
      {
        boardId,
        action: ActionType.DELETE_ALL,
        allowedRoles: [Role.ADMIN],
      },
    ];

    await this.prisma.boardPermission.createMany({
      data: defaultPermissions,
      skipDuplicates: true,
    });
  }

  // 회원 전용 게시판 권한 설정
  async createMemberOnlyPermissions(boardId: string): Promise<void> {
    const memberPermissions = [
      {
        boardId,
        action: ActionType.READ,
        allowedRoles: [Role.USER, Role.MODERATOR, Role.ADMIN],
      },
      {
        boardId,
        action: ActionType.WRITE,
        allowedRoles: [Role.USER, Role.MODERATOR, Role.ADMIN],
      },
      {
        boardId,
        action: ActionType.EDIT_OWN,
        allowedRoles: [Role.USER, Role.MODERATOR, Role.ADMIN],
      },
      {
        boardId,
        action: ActionType.DELETE_OWN,
        allowedRoles: [Role.USER, Role.MODERATOR, Role.ADMIN],
      },
      {
        boardId,
        action: ActionType.COMMENT,
        allowedRoles: [Role.USER, Role.MODERATOR, Role.ADMIN],
      },
      {
        boardId,
        action: ActionType.EDIT_ALL,
        allowedRoles: [Role.MODERATOR, Role.ADMIN],
      },
      {
        boardId,
        action: ActionType.DELETE_ALL,
        allowedRoles: [Role.ADMIN],
      },
    ];

    await this.prisma.boardPermission.createMany({
      data: memberPermissions,
      skipDuplicates: true,
    });
  }

  // 공지사항 게시판 권한 설정
  async createNoticePermissions(boardId: string): Promise<void> {
    const noticePermissions = [
      { boardId, action: ActionType.READ, allowAnonymous: true },
      {
        boardId,
        action: ActionType.WRITE,
        allowedRoles: [Role.ADMIN],
      },
      {
        boardId,
        action: ActionType.EDIT_ALL,
        allowedRoles: [Role.ADMIN],
      },
      {
        boardId,
        action: ActionType.DELETE_ALL,
        allowedRoles: [Role.ADMIN],
      },
      {
        boardId,
        action: ActionType.COMMENT,
        allowedRoles: [Role.USER, Role.MODERATOR, Role.ADMIN],
      },
    ];

    await this.prisma.boardPermission.createMany({
      data: noticePermissions,
      skipDuplicates: true,
    });
  }
}
