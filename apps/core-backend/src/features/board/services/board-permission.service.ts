import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaService } from '@weaver2/prisma';
import { CommonAuthUserDto } from '@weaver2/common';
import { PermissionService } from '../../../core/permission/services/permission.service';

/**
 * 권한 행을 만드는 쪽은 트랜잭션 안에서도 불린다 — 게시판 생성이 게시판과 권한을
 * 한 덩어리로 묶기 때문이다(`board.service.ts`).
 */
type Db = PrismaClient | Prisma.TransactionClient;

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
    db: Db = this.prisma,
  ): Promise<void> {
    const { allowAnonymous = false, allowedGroupNames = [] } = options;

    const resourcePermission = await db.resourcePermission.upsert({
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
      const groups = await db.permissionGroup.findMany({
        where: { name: { in: allowedGroupNames } },
        select: { id: true },
      });

      for (const group of groups) {
        await db.resourcePermissionAllowedGroup.upsert({
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
  async createDefaultPermissions(
    boardId: string,
    db: Db = this.prisma,
  ): Promise<void> {
    // 익명 허용
    await this.createBoardResourcePermission(
      boardId,
      'read',
      { allowAnonymous: true },
      db,
    );
    await this.createBoardResourcePermission(
      boardId,
      'write',
      { allowAnonymous: true },
      db,
    );
    await this.createBoardResourcePermission(
      boardId,
      'edit_own',
      { allowAnonymous: true },
      db,
    );
    await this.createBoardResourcePermission(
      boardId,
      'delete_own',
      { allowAnonymous: true },
      db,
    );
    await this.createBoardResourcePermission(
      boardId,
      'comment',
      { allowAnonymous: true },
      db,
    );
    // 관리 권한
    await this.createBoardResourcePermission(
      boardId,
      'edit_all',
      { allowedGroupNames: ['Moderator', 'Admin'] },
      db,
    );
    await this.createBoardResourcePermission(
      boardId,
      'delete_all',
      { allowedGroupNames: ['Admin'] },
      db,
    );
  }

  /** 회원 전용 게시판 권한 설정 */
  async createMemberOnlyPermissions(
    boardId: string,
    db: Db = this.prisma,
  ): Promise<void> {
    // 로그인 사용자만 (allowedGroups 비어있으면 로그인만으로 허용)
    await this.createBoardResourcePermission(boardId, 'read', {}, db);
    await this.createBoardResourcePermission(boardId, 'write', {}, db);
    await this.createBoardResourcePermission(boardId, 'edit_own', {}, db);
    await this.createBoardResourcePermission(boardId, 'delete_own', {}, db);
    await this.createBoardResourcePermission(boardId, 'comment', {}, db);
    // 관리 권한
    await this.createBoardResourcePermission(
      boardId,
      'edit_all',
      { allowedGroupNames: ['Moderator', 'Admin'] },
      db,
    );
    await this.createBoardResourcePermission(
      boardId,
      'delete_all',
      { allowedGroupNames: ['Admin'] },
      db,
    );
  }

  /** 공지사항 게시판 권한 설정 */
  async createNoticePermissions(
    boardId: string,
    db: Db = this.prisma,
  ): Promise<void> {
    await this.createBoardResourcePermission(
      boardId,
      'read',
      { allowAnonymous: true },
      db,
    );
    await this.createBoardResourcePermission(
      boardId,
      'write',
      { allowedGroupNames: ['Admin'] },
      db,
    );
    await this.createBoardResourcePermission(
      boardId,
      'edit_all',
      { allowedGroupNames: ['Admin'] },
      db,
    );
    await this.createBoardResourcePermission(
      boardId,
      'delete_all',
      { allowedGroupNames: ['Admin'] },
      db,
    );
    // 본인 글 수정·삭제. **`edit_all` 이 있으니 필요 없다고 보면 틀린다** —
    // `canEdit`/`canDelete` 는 작성자 본인이면 `*_OWN` 만 보고 끝내고 `*_ALL` 로
    // 넘어가지 않는다. 이 두 줄이 없으면 규칙 부재로 거부되어, 공지를 쓴 관리자가
    // 자기 공지를 고치지도 지우지도 못한다.
    //
    // 허용 그룹을 비워 로그인 사용자로 두는 것은 넓히는 것이 아니다. 이 게시판에
    // 글을 쓸 수 있는 사람이 `Admin` 뿐이므로 본인 글을 가진 사람도 그들뿐이다.
    await this.createBoardResourcePermission(boardId, 'edit_own', {}, db);
    await this.createBoardResourcePermission(boardId, 'delete_own', {}, db);
    // 댓글은 로그인 사용자만
    await this.createBoardResourcePermission(boardId, 'comment', {}, db);
  }
}
