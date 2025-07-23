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
import { UpdateBoardDto } from '../dto/update-board.dto';
import { UpdateBoardCommand } from '../repositories/update-board.command';
import { DeleteBoardCommand } from '../repositories/delete-board.command';

@Injectable()
export class BoardService {
  constructor(private readonly prisma: PrismaService) {}

  async createBoard(dto: CreateBoardDto): Promise<BoardDto> {
    const existingBoard = await this.prisma.board.findUnique({
      where: { name: dto.name },
    });
    if (existingBoard) {
      throw new ConflictException(
        `Board with name '${dto.name}' already exists.`,
      );
    }
    const board = await CreateBoardCommand(
      this.prisma,
      dto.name,
      dto.description,
    );
    return board;
  }

  async findAllBoards(): Promise<BoardDto[]> {
    return FindAllBoardsQuery(this.prisma);
  }

  async findPublicBoards(): Promise<BoardDto[]> {
    return this.prisma.board.findMany({
      where: {
        isPublic: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
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
      const nameConflict = await this.prisma.board.findUnique({
        where: { name: dto.name },
      });
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
