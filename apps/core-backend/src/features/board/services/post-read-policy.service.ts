import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@weaver2/prisma';
import { CommonAuthUserDto } from '@weaver2/common';
import {
  BoardActionType,
  BoardPermissionService,
} from './board-permission.service';

/** 읽기 판정에 필요한 글의 모양 */
export interface PostReadTarget {
  boardId: string;
  authorId: string;
  isSecret: boolean;
  status: string;
  deletedAt: Date | null;
  hiddenAt: Date | null;
}

/** 아무도(작성자·관리자 포함) 예외 없이 보는 상태 — 초안·가림·삭제는 목록과 상세 어디에도 없다 */
export const VISIBLE_POST_WHERE = {
  status: 'PUBLISHED',
  deletedAt: null,
  hiddenAt: null,
} satisfies Prisma.PostWhereInput;

/**
 * 「이 사람이 이 글을 읽을 수 있나」를 답하는 한 곳 (파일 접근 통제 설계 §4.3).
 * 글 상세·목록(게시판 있음/없음)·작성자별 목록·검색·댓글·첨부가 전부 이것을 쓴다.
 *
 * - 글 상태: VISIBLE_POST_WHERE
 * - 게시판 READ: PermissionService.hasResourcePermission 그대로(거부 기본값·최고관리자 통과·거부 그룹)
 * - 비밀글: 작성자와 그 게시판의 관리자(edit_all 또는 delete_all)만 (§7)
 */
@Injectable()
export class PostReadPolicy {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardPermission: BoardPermissionService,
  ) {}

  async canRead(
    viewer: CommonAuthUserDto | undefined,
    post: PostReadTarget,
  ): Promise<boolean> {
    return (await this.check(viewer, post)) === 'ok';
  }

  /**
   * 왜 못 읽는지까지 나눠 준다. 게시판 READ 가 없으면 지금처럼 403(`forbidden`),
   * 글이 보이지 않는 상태이거나 남의 비밀글이면 404(`not_found`) — 비밀글의 존재를 알리지 않는다.
   */
  async check(
    viewer: CommonAuthUserDto | undefined,
    post: PostReadTarget,
  ): Promise<'ok' | 'forbidden' | 'not_found'> {
    if (
      post.status !== VISIBLE_POST_WHERE.status ||
      post.deletedAt !== null ||
      post.hiddenAt !== null
    ) {
      return 'not_found';
    }
    const canReadBoard = await this.boardPermission.canPerformAction(
      post.boardId,
      BoardActionType.READ,
      viewer,
    );
    if (!canReadBoard) return 'forbidden';
    if (!post.isSecret) return 'ok';
    if (viewer?.isLogin && viewer.id === post.authorId) return 'ok';
    return (await this.canManage(post.boardId, viewer)) ? 'ok' : 'not_found';
  }

  /**
   * 목록의 조건. boardId 를 주면 그 게시판만, 아니면 지워지지 않은 모든 게시판에서 READ 가 되는 곳.
   * 글마다 권한을 묻지 않는다 — 게시판 수는 작아 게시판마다 한 번씩 묻고 `IN (…)` 으로 거른다.
   * 남의 비밀글은 목록에서도 뺀다(지금 목록이 비로그인에게 하던 방식).
   */
  async listWhere(
    viewer: CommonAuthUserDto | undefined,
    boardId?: string,
  ): Promise<Prisma.PostWhereInput> {
    const readable = await this.readableBoardIds(viewer, boardId);
    const managed = viewer?.isLogin
      ? await this.filterManaged(readable, viewer)
      : [];

    const secretVisible: Prisma.PostWhereInput[] = [{ isSecret: false }];
    if (viewer?.isLogin) secretVisible.push({ authorId: viewer.id });
    if (managed.length > 0) secretVisible.push({ boardId: { in: managed } });

    return {
      ...VISIBLE_POST_WHERE,
      boardId: { in: readable },
      AND: [{ OR: secretVisible }],
    };
  }

  /**
   * READ 가 되는 게시판 id. 손으로 쓴 SQL(검색)이 `"boardId" IN (…)` 으로 쓴다 —
   * 그 쪽은 비밀글을 통째로 빼므로 관리자 판정이 필요 없다.
   */
  async readableBoardIds(
    viewer: CommonAuthUserDto | undefined,
    boardId?: string,
  ): Promise<string[]> {
    const boardIds = boardId ? [boardId] : await this.activeBoardIds();
    return this.filterBoards(boardIds, BoardActionType.READ, viewer);
  }

  private async canManage(
    boardId: string,
    viewer: CommonAuthUserDto | undefined,
  ): Promise<boolean> {
    if (!viewer?.isLogin) return false;
    return (
      (await this.boardPermission.canPerformAction(
        boardId,
        BoardActionType.EDIT_ALL,
        viewer,
      )) ||
      this.boardPermission.canPerformAction(
        boardId,
        BoardActionType.DELETE_ALL,
        viewer,
      )
    );
  }

  private async activeBoardIds(): Promise<string[]> {
    const boards = await this.prisma.board.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    return boards.map((b) => b.id);
  }

  private async filterBoards(
    boardIds: string[],
    action: BoardActionType,
    viewer: CommonAuthUserDto | undefined,
  ): Promise<string[]> {
    const allowed = await Promise.all(
      boardIds.map((id) =>
        this.boardPermission.canPerformAction(id, action, viewer),
      ),
    );
    return boardIds.filter((_, i) => allowed[i]);
  }

  private async filterManaged(
    boardIds: string[],
    viewer: CommonAuthUserDto,
  ): Promise<string[]> {
    const managed = await Promise.all(
      boardIds.map((id) => this.canManage(id, viewer)),
    );
    return boardIds.filter((_, i) => managed[i]);
  }
}
