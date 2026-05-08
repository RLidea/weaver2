import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { CategoryDto } from '../dto/category.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { BoardService } from './board.service';
import {
  FindCategoryByIdQuery,
  FindCategoryByBoardAndNameQuery,
  FindCategoriesByBoardQuery,
  CreateCategoryCommand,
  UpdateCategoryCommand,
  DeleteCategoryCommand,
  ClearPostsCategoryCommand,
} from '../repositories/category.repository';

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardService: BoardService,
  ) {}

  async create(boardId: string, dto: CreateCategoryDto): Promise<CategoryDto> {
    await this.boardService.findBoardById(boardId);

    const existing = await FindCategoryByBoardAndNameQuery(
      this.prisma,
      boardId,
      dto.name,
    );
    if (existing) {
      throw new ConflictException(
        `Category with name '${dto.name}' already exists in this board.`,
      );
    }

    return CreateCategoryCommand(this.prisma, boardId, dto);
  }

  async findAllByBoardId(boardId: string): Promise<CategoryDto[]> {
    await this.boardService.findBoardById(boardId);
    return FindCategoriesByBoardQuery(this.prisma, boardId);
  }

  async findById(boardId: string, categoryId: string): Promise<CategoryDto> {
    const category = await FindCategoryByIdQuery(this.prisma, categoryId);
    if (!category || category.boardId !== boardId) {
      throw new NotFoundException(
        `Category with ID '${categoryId}' not found in this board.`,
      );
    }
    return category;
  }

  async update(
    boardId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    await this.findById(boardId, categoryId);

    if (dto.name) {
      const conflict = await FindCategoryByBoardAndNameQuery(
        this.prisma,
        boardId,
        dto.name,
      );
      if (conflict && conflict.id !== categoryId) {
        throw new ConflictException(
          `Category with name '${dto.name}' already exists in this board.`,
        );
      }
    }

    return UpdateCategoryCommand(this.prisma, categoryId, dto);
  }

  async delete(boardId: string, categoryId: string): Promise<void> {
    await this.findById(boardId, categoryId);

    // 해당 카테고리를 사용 중인 게시글의 categoryId를 null로 해제 후 삭제
    await this.prisma.$transaction(async (tx) => {
      await ClearPostsCategoryCommand(tx, categoryId);
      await DeleteCategoryCommand(tx, categoryId);
    });
  }
}
