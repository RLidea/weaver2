import { NotFoundException } from '@nestjs/common';
import { Prisma, PrismaService } from '@weaver2/prisma';
import { PostRevisionService } from './post-revision.service';

jest.mock('../repositories/create-post-revision.command', () => ({
  CreatePostRevisionCommand: jest.fn(),
}));
jest.mock('../repositories/find-latest-post-revision.query', () => ({
  FindLatestPostRevisionQuery: jest.fn(),
}));
jest.mock('../repositories/find-post-revisions.query', () => ({
  FindPostRevisionsQuery: jest.fn(),
}));
jest.mock('../repositories/find-post-revision-by-id.query', () => ({
  FindPostRevisionByIdQuery: jest.fn(),
}));

import { CreatePostRevisionCommand } from '../repositories/create-post-revision.command';
import { FindLatestPostRevisionQuery } from '../repositories/find-latest-post-revision.query';
import { FindPostRevisionsQuery } from '../repositories/find-post-revisions.query';
import { FindPostRevisionByIdQuery } from '../repositories/find-post-revision-by-id.query';

describe('PostRevisionService.record', () => {
  const mockCreate = CreatePostRevisionCommand as jest.Mock;
  const mockLatest = FindLatestPostRevisionQuery as jest.Mock;

  let findPost: jest.Mock;
  let tx: Prisma.TransactionClient;
  let service: PostRevisionService;

  const input = {
    postId: 'post-1',
    title: '제목',
    content: '본문',
    actor: { userId: 'user-1', kind: 'SESSION' as const },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findPost = jest.fn().mockResolvedValue({ board: { keepRevisions: true } });
    tx = {
      post: { findUnique: findPost },
    } as unknown as Prisma.TransactionClient;
    mockLatest.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'rev-1' });
    service = new PostRevisionService({} as PrismaService);
  });

  it('게시판이 꺼져 있으면 쓰지 않고 null', async () => {
    findPost.mockResolvedValue({ board: { keepRevisions: false } });

    await expect(service.record(tx, input)).resolves.toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('글이 없으면 null — 호출자의 트랜잭션을 깨지 않는다', async () => {
    findPost.mockResolvedValue(null);

    await expect(service.record(tx, input)).resolves.toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  /** 글 쓰기와 판 쓰기가 한 덩어리여야 「글은 고쳐졌는데 판이 없다」가 생기지 않는다 */
  it('켜져 있고 판이 없으면 넘겨받은 tx 로 쓴다', async () => {
    await expect(service.record(tx, input)).resolves.toEqual({ id: 'rev-1' });

    expect(findPost).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'post-1' } }),
    );
    expect(mockLatest).toHaveBeenCalledWith(tx, 'post-1');
    expect(mockCreate).toHaveBeenCalledWith(tx, {
      postId: 'post-1',
      title: '제목',
      content: '본문',
      actorUserId: 'user-1',
      actorKind: 'SESSION',
    });
  });

  it('직전 판과 제목 · 본문이 같으면 쓰지 않는다', async () => {
    mockLatest.mockResolvedValue({ title: '제목', content: '본문' });

    await expect(service.record(tx, input)).resolves.toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['제목만', { title: '옛 제목', content: '본문' }],
    ['본문만', { title: '제목', content: '옛 본문' }],
  ])('%s 달라도 쓴다', async (_label, latest) => {
    mockLatest.mockResolvedValue(latest);

    await service.record(tx, input);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('익명 · 토큰 주체도 그대로 남긴다', async () => {
    await service.record(tx, {
      ...input,
      actor: { userId: null, kind: 'TOKEN' },
    });

    expect(mockCreate).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ actorUserId: null, actorKind: 'TOKEN' }),
    );
  });
});

describe('PostRevisionService 조회', () => {
  const mockList = FindPostRevisionsQuery as jest.Mock;
  const mockFindById = FindPostRevisionByIdQuery as jest.Mock;

  let findPost: jest.Mock;
  let service: PostRevisionService;

  beforeEach(() => {
    jest.clearAllMocks();
    findPost = jest.fn().mockResolvedValue({ id: 'post-1' });
    const prisma = {
      post: { findUnique: findPost },
    } as unknown as PrismaService;
    service = new PostRevisionService(prisma);
  });

  it('판 목록은 글이 없으면 404', async () => {
    findPost.mockResolvedValue(null);

    await expect(service.findByPostId('post-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(mockList).not.toHaveBeenCalled();
  });

  it('판 목록을 그대로 돌려준다', async () => {
    mockList.mockResolvedValue([{ id: 'rev-2' }, { id: 'rev-1' }]);

    await expect(service.findByPostId('post-1')).resolves.toEqual([
      { id: 'rev-2' },
      { id: 'rev-1' },
    ]);
  });

  it('판 전문은 없으면 404', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(service.findOne('post-1', 'rev-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  /** 경로의 글 id 와 판의 글이 다르면 남의 글 판을 엉뚱한 주소로 읽게 된다 */
  it('판 전문은 다른 글의 판이면 404', async () => {
    mockFindById.mockResolvedValue({ id: 'rev-1', postId: 'post-2' });

    await expect(service.findOne('post-1', 'rev-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('판 전문을 돌려준다', async () => {
    mockFindById.mockResolvedValue({ id: 'rev-1', postId: 'post-1' });

    await expect(service.findOne('post-1', 'rev-1')).resolves.toEqual({
      id: 'rev-1',
      postId: 'post-1',
    });
  });
});
