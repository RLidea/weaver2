import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { CommonAuthUserDto } from '@weaver2/common';
import { PermissionService } from '../../../core/permission/services/permission.service';

export enum BoardActionType {
  READ = 'read',
  WRITE = 'write',
  EDIT_OWN = 'edit_own',
  EDIT_ALL = 'edit_all',
  DELETE_OWN = 'delete_own',
  DELETE_ALL = 'delete_all',
  COMMENT = 'comment',
}

@Injectable()
export class BoardPermissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
  ) {}

  async canPerformAction(
    boardId: string,
    action: BoardActionType,
    user?: CommonAuthUserDto,
  ): Promise<boolean> {
    const userId = user?.isLogin ? user.id : null;
    return this.permissionService.hasResourcePermission(
      userId,
      'board',
      boardId,
      action,
    );
  }

  async canEdit(
    item: { authorId: string; boardId: string },
    user?: CommonAuthUserDto,
  ): Promise<boolean> {
    if (!user?.isLogin) {
      return false;
    }

    if (item.authorId === user.id) {
      return this.canPerformAction(
        item.boardId,
        BoardActionType.EDIT_OWN,
        user,
      );
    }

    return this.canPerformAction(item.boardId, BoardActionType.EDIT_ALL, user);
  }

  async canDelete(
    item: { authorId: string; boardId: string },
    user?: CommonAuthUserDto,
  ): Promise<boolean> {
    if (!user?.isLogin) {
      return false;
    }

    if (item.authorId === user.id) {
      return this.canPerformAction(
        item.boardId,
        BoardActionType.DELETE_OWN,
        user,
      );
    }

    return this.canPerformAction(
      item.boardId,
      BoardActionType.DELETE_ALL,
      user,
    );
  }

  async requirePermission(
    boardId: string,
    action: BoardActionType,
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

  /**
   * ResourcePermission 기반 게시판 권한 생성 헬퍼
   */
  private async createBoardResourcePermission(
    boardId: string,
    action: string,
    options: {
      allowAnonymous?: boolean;
      allowedGroupNames?: string[];
    },
  ): Promise<void> {
    const { allowAnonymous = false, allowedGroupNames = [] } = options;

    const resourcePermission = await this.prisma.resourcePermission.upsert({
      where: {
        resourceType_resourceId_action: {
          resourceType: 'board',
          resourceId: boardId,
          action,
        },
      },
      update: { allowAnonymous },
      create: {
        resourceType: 'board',
        resourceId: boardId,
        action,
        allowAnonymous,
      },
    });

    if (allowedGroupNames.length > 0) {
      const groups = await this.prisma.permissionGroup.findMany({
        where: { name: { in: allowedGroupNames } },
        select: { id: true },
      });

      for (const group of groups) {
        await this.prisma.resourcePermissionAllowedGroup.upsert({
          where: {
            resourcePermissionId_permissionGroupId: {
              resourcePermissionId: resourcePermission.id,
              permissionGroupId: group.id,
            },
          },
          update: {},
          create: {
            resourcePermissionId: resourcePermission.id,
            permissionGroupId: group.id,
          },
        });
      }
    }
  }

  /** 공개 게시판 기본 권한 설정 */
  async createDefaultPermissions(boardId: string): Promise<void> {
    // 익명 허용
    await this.createBoardResourcePermission(boardId, 'read', {
      allowAnonymous: true,
    });
    await this.createBoardResourcePermission(boardId, 'write', {
      allowAnonymous: true,
    });
    await this.createBoardResourcePermission(boardId, 'edit_own', {
      allowAnonymous: true,
    });
    await this.createBoardResourcePermission(boardId, 'delete_own', {
      allowAnonymous: true,
    });
    await this.createBoardResourcePermission(boardId, 'comment', {
      allowAnonymous: true,
    });
    // 관리 권한
    await this.createBoardResourcePermission(boardId, 'edit_all', {
      allowedGroupNames: ['Moderator', 'Admin'],
    });
    await this.createBoardResourcePermission(boardId, 'delete_all', {
      allowedGroupNames: ['Admin'],
    });
  }

  /** 회원 전용 게시판 권한 설정 */
  async createMemberOnlyPermissions(boardId: string): Promise<void> {
    // 로그인 사용자만 (allowedGroups 비어있으면 로그인만으로 허용)
    await this.createBoardResourcePermission(boardId, 'read', {});
    await this.createBoardResourcePermission(boardId, 'write', {});
    await this.createBoardResourcePermission(boardId, 'edit_own', {});
    await this.createBoardResourcePermission(boardId, 'delete_own', {});
    await this.createBoardResourcePermission(boardId, 'comment', {});
    // 관리 권한
    await this.createBoardResourcePermission(boardId, 'edit_all', {
      allowedGroupNames: ['Moderator', 'Admin'],
    });
    await this.createBoardResourcePermission(boardId, 'delete_all', {
      allowedGroupNames: ['Admin'],
    });
  }

  /** 공지사항 게시판 권한 설정 */
  async createNoticePermissions(boardId: string): Promise<void> {
    await this.createBoardResourcePermission(boardId, 'read', {
      allowAnonymous: true,
    });
    await this.createBoardResourcePermission(boardId, 'write', {
      allowedGroupNames: ['Admin'],
    });
    await this.createBoardResourcePermission(boardId, 'edit_all', {
      allowedGroupNames: ['Admin'],
    });
    await this.createBoardResourcePermission(boardId, 'delete_all', {
      allowedGroupNames: ['Admin'],
    });
    // 댓글은 로그인 사용자만
    await this.createBoardResourcePermission(boardId, 'comment', {});
  }
}
