import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  PrismaService,
  PostRevision,
  PostRevisionActorKind,
} from '@weaver2/prisma';
import {
  PostRevisionDto,
  PostRevisionSummaryDto,
} from '../dto/post-revision.dto';
import { CreatePostRevisionCommand } from '../repositories/create-post-revision.command';
import { FindLatestPostRevisionQuery } from '../repositories/find-latest-post-revision.query';
import { FindPostRevisionsQuery } from '../repositories/find-post-revisions.query';
import { FindPostRevisionByIdQuery } from '../repositories/find-post-revision-by-id.query';

/** 판을 남긴 주체. 익명 작성이면 userId 가 null 이다 */
export interface PostRevisionActor {
  userId: string | null;
  kind: PostRevisionActorKind;
}

/**
 * 글의 판 — 저장한 뒤의 제목 · 본문. 게시판의 keepRevisions 가 켜져 있을 때만 쌓인다.
 * 쓰기는 호출자의 트랜잭션에 얹힌다. PostService 와, 게시판 권한 판정을 거치지 않는
 * 파생 프로젝트의 쓰기 경로가 같은 record 를 부른다.
 */
@Injectable()
export class PostRevisionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 게시판이 켜져 있고 제목 · 본문이 직전 판과 다를 때만 판을 쓴다. 안 썼으면 null.
   * 글이 없어도 null 이다 — 글이 있는지는 호출자가 이미 판정했고, 여기서 던지면 호출자의
   * 트랜잭션까지 되돌려진다.
   */
  async record(
    tx: Prisma.TransactionClient,
    input: {
      postId: string;
      title: string;
      content: string;
      actor: PostRevisionActor;
    },
  ): Promise<PostRevision | null> {
    const post = await tx.post.findUnique({
      where: { id: input.postId },
      select: { board: { select: { keepRevisions: true } } },
    });
    if (!post?.board.keepRevisions) return null;

    // 상태 · 고정 · 첨부만 바꾼 저장이 판을 늘리지 않게 한다
    const latest = await FindLatestPostRevisionQuery(tx, input.postId);
    if (
      latest &&
      latest.title === input.title &&
      latest.content === input.content
    ) {
      return null;
    }

    return CreatePostRevisionCommand(tx, {
      postId: input.postId,
      title: input.title,
      content: input.content,
      actorUserId: input.actor.userId,
      actorKind: input.actor.kind,
    });
  }

  /** 판 목록 (최신 순, 본문 없음). 소프트 삭제 · 숨김 글도 본다 — 관리 조회다 */
  async findByPostId(postId: string): Promise<PostRevisionSummaryDto[]> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      throw new NotFoundException(`Post with ID '${postId}' not found.`);
    }
    return FindPostRevisionsQuery(this.prisma, postId);
  }

  /** 판 전문. 경로의 글과 판의 글이 다르면 404 */
  async findOne(postId: string, revisionId: string): Promise<PostRevisionDto> {
    const revision = await FindPostRevisionByIdQuery(this.prisma, revisionId);
    if (!revision || revision.postId !== postId) {
      throw new NotFoundException(
        `Revision with ID '${revisionId}' not found.`,
      );
    }
    return revision;
  }
}
