import { ConflictException } from '@nestjs/common';
import { BoardService } from './board.service';
import { BoardPermissionService } from './board-permission.service';
import { PrismaService } from '@weaver2/prisma';

jest.mock('../repositories/create-board.command', () => ({
  CreateBoardCommand: jest.fn(),
}));

jest.mock('../repositories/find-board-by-name.query', () => ({
  FindBoardByNameQuery: jest.fn(),
}));

import { CreateBoardCommand } from '../repositories/create-board.command';
import { FindBoardByNameQuery } from '../repositories/find-board-by-name.query';

describe('BoardService.createBoard', () => {
  const mockCreate = CreateBoardCommand as jest.Mock;
  const mockFindByName = FindBoardByNameQuery as jest.Mock;

  /** `$transaction` 이 콜백에 넘기는 클라이언트. 같은 것이 끝까지 전달되는지 본다. */
  const tx = { marker: 'transaction-client' };

  let service: BoardService;
  let permission: { createDefaultPermissions: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindByName.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'board-1', name: '공지' });
    permission = {
      createDefaultPermissions: jest.fn().mockResolvedValue(undefined),
    };

    const prisma = {
      $transaction: jest.fn((cb: (client: unknown) => unknown) => cb(tx)),
    } as unknown as PrismaService;

    service = new BoardService(
      prisma,
      permission as unknown as BoardPermissionService,
    );
  });

  /**
   * 게시판만 만들어지고 권한이 안 깔리면 **규칙 0개 게시판**이 남는다. 규칙 부재는
   * 곧 거부이므로 아무도 읽지 못하는데, unique 한 이름은 붙잡고 있어 같은 이름으로
   * 다시 만들 수도 없다. 둘은 한 덩어리여야 한다.
   */
  it('게시판 생성과 권한 생성이 같은 트랜잭션 클라이언트를 쓴다', async () => {
    await service.createBoard({ name: '공지', description: '설명' });

    expect(mockCreate).toHaveBeenCalledWith(tx, '공지', '설명');
    expect(permission.createDefaultPermissions).toHaveBeenCalledWith(
      'board-1',
      tx,
    );
  });

  it('권한 생성이 실패하면 그 실패가 밖으로 나간다 — 트랜잭션이 되돌려진다', async () => {
    permission.createDefaultPermissions.mockRejectedValue(
      new Error('권한 실패'),
    );

    await expect(service.createBoard({ name: '공지' })).rejects.toThrow(
      '권한 실패',
    );
  });

  it('같은 이름이 이미 있으면 409 — 트랜잭션을 열기 전에 막는다', async () => {
    mockFindByName.mockResolvedValue({ id: 'board-0' });

    await expect(service.createBoard({ name: '공지' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
