import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { CreateBoardDto } from '../dto/create-board.dto';
import { BoardDto } from '../dto/board.dto';
import { CreateBoardCommand } from '../repositories/create-board.command';
import { FindAllBoardsQuery } from '../repositories/find-all-boards.query';
import { FindBoardByIdQuery } from '../repositories/find-board-by-id.query';
import { FindBoardByNameQuery } from '../repositories/find-board-by-name.query';
import { UpdateBoardDto } from '../dto/update-board.dto';
import { UpdateBoardCommand } from '../repositories/update-board.command';
import { DeleteBoardCommand } from '../repositories/delete-board.command';
import { BoardPermissionService } from './board-permission.service';

@Injectable()
export class BoardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: BoardPermissionService,
  ) {}

  async createBoard(dto: CreateBoardDto): Promise<BoardDto> {
    const existingBoard = await FindBoardByNameQuery(this.prisma, dto.name);
    if (existingBoard) {
      throw new ConflictException(
        `Board with name '${dto.name}' already exists.`,
      );
    }
    // 게시판과 그 권한 규칙을 **한 덩어리로** 만든다. 사이에서 실패하면 규칙이
    // 하나도 없는 게시판이 남는데, 규칙 부재는 곧 거부라 아무도 읽지 못하면서
    // unique 한 이름만 붙잡고 있어 같은 이름으로 다시 만들 수도 없다.
    return this.prisma.$transaction(async (tx) => {
      const board = await CreateBoardCommand(tx, dto.name, dto.description);

      await this.permissionService.createDefaultPermissions(board.id, tx);

      return board;
    });
  }

  async findAllBoards(): Promise<BoardDto[]> {
    return FindAllBoardsQuery(this.prisma);
  }

  async findBoardById(id: string): Promise<BoardDto> {
    const board = await FindBoardByIdQuery(this.prisma, id);
    if (!board) {
      throw new NotFoundException(`Board with ID '${id}' not found.`);
    }
    return board;
  }

  async updateBoard(id: string, dto: UpdateBoardDto): Promise<BoardDto> {
    const existingBoard = await FindBoardByIdQuery(this.prisma, id);
    if (!existingBoard) {
      throw new NotFoundException(`Board with ID '${id}' not found.`);
    }

    if (dto.name && dto.name !== existingBoard.name) {
      const nameConflict = await FindBoardByNameQuery(this.prisma, dto.name);
      if (nameConflict) {
        throw new ConflictException(
          `Board with name '${dto.name}' already exists.`,
        );
      }
    }

    const updatedBoard = await UpdateBoardCommand(this.prisma, id, dto);
    return updatedBoard;
  }

  async deleteBoard(id: string): Promise<void> {
    const existingBoard = await FindBoardByIdQuery(this.prisma, id);
    if (!existingBoard) {
      throw new NotFoundException(`Board with ID '${id}' not found.`);
    }
    await DeleteBoardCommand(this.prisma, id);
  }
}
