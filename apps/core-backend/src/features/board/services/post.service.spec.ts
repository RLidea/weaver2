import { PrismaService } from '@weaver2/prisma';
import { UploadService } from '@weaver2/upload';
import { CommonAuthUserDto } from '@weaver2/common';
import { PostService } from './post.service';
import { BoardService } from './board.service';
import { PostReadPolicy } from './post-read-policy.service';
import { PostRevisionService } from './post-revision.service';

jest.mock('../repositories/create-post.command', () => ({
  CreatePostCommand: jest.fn(),
}));
jest.mock('../repositories/update-post.command', () => ({
  UpdatePostCommand: jest.fn(),
}));

import { CreatePostCommand } from '../repositories/create-post.command';
import { UpdatePostCommand } from '../repositories/update-post.command';

describe('PostService — 판 기록', () => {
  const mockCreate = CreatePostCommand as jest.Mock;
  const mockUpdate = UpdatePostCommand as jest.Mock;

  /** `$transaction` 이 콜백에 넘기는 클라이언트. 같은 것이 판 기록까지 가는지 본다 */
  const tx = {
    postAttachment: { findMany: jest.fn().mockResolvedValue([]) },
  };

  let revisions: { record: jest.Mock };
  let service: PostService;

  const editor = { isLogin: true, id: 'editor-1' } as CommonAuthUserDto;

  beforeEach(() => {
    jest.clearAllMocks();
    revisions = { record: jest.fn().mockResolvedValue(null) };
    mockUpdate.mockResolvedValue({
      id: 'post-1',
      title: '고친 제목',
      content: '고친 본문',
    });
    mockCreate.mockResolvedValue({
      id: 'post-1',
      title: '제목',
      content: '본문',
    });

    const prisma = {
      $transaction: jest.fn((cb: (client: unknown) => unknown) => cb(tx)),
      postAttachment: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;

    service = new PostService(
      prisma,
      {
        findBoardById: jest.fn().mockResolvedValue({ id: 'board-1' }),
      } as unknown as BoardService,
      {} as PostReadPolicy,
      { toDto: jest.fn() } as unknown as UploadService,
      revisions as unknown as PostRevisionService,
    );
  });

  it('고친 뒤의 제목 · 본문으로 같은 트랜잭션에서 판을 남긴다', async () => {
    await service.updatePost('post-1', { title: '고친 제목' }, editor, {
      authorId: 'author-1',
    });

    expect(revisions.record).toHaveBeenCalledWith(tx, {
      postId: 'post-1',
      title: '고친 제목',
      content: '고친 본문',
      actor: { userId: 'editor-1', kind: 'SESSION' },
    });
  });

  it('판 기록이 실패하면 고치기도 실패한다 — 한 덩어리다', async () => {
    revisions.record.mockRejectedValue(new Error('판 실패'));

    await expect(
      service.updatePost('post-1', { title: '고친 제목' }, editor, {
        authorId: 'author-1',
      }),
    ).rejects.toThrow('판 실패');
  });

  it('글을 만들 때 첫 판을 남긴다', async () => {
    await service.createPost('board-1', 'author-1', {
      boardId: 'board-1',
      title: '제목',
      content: '본문',
    });

    expect(revisions.record).toHaveBeenCalledWith(tx, {
      postId: 'post-1',
      title: '제목',
      content: '본문',
      actor: { userId: 'author-1', kind: 'SESSION' },
    });
  });

  it('익명 작성이면 남긴 사람이 null 이다', async () => {
    await service.createPost('board-1', null, {
      boardId: 'board-1',
      title: '제목',
      content: '본문',
    });

    expect(revisions.record).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ actor: { userId: null, kind: 'SESSION' } }),
    );
  });
});
