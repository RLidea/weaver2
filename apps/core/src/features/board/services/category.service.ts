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

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardService: BoardService,
  ) {}

  async create(boardId: string, dto: CreateCategoryDto): Promise<CategoryDto> {
    await this.boardService.findBoardById(boardId);

    const existing = await this.prisma.postCategory.findUnique({
      where: { boardId_name: { boardId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(
        `Category with name '${dto.name}' already exists in this board.`,
      );
    }

    return this.prisma.postCategory.create({
      data: {
        board: { connect: { id: boardId } },
        name: dto.name,
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async findAllByBoardId(boardId: string): Promise<CategoryDto[]> {
    await this.boardService.findBoardById(boardId);

    return this.prisma.postCategory.findMany({
      where: { boardId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findById(boardId: string, categoryId: string): Promise<CategoryDto> {
    const category = await this.prisma.postCategory.findUnique({
      where: { id: categoryId },
    });
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
      const conflict = await this.prisma.postCategory.findUnique({
        where: { boardId_name: { boardId, name: dto.name } },
      });
      if (conflict && conflict.id !== categoryId) {
        throw new ConflictException(
          `Category with name '${dto.name}' already exists in this board.`,
        );
      }
    }

    return this.prisma.postCategory.update({
      where: { id: categoryId },
      data: dto,
    });
  }

  async delete(boardId: string, categoryId: string): Promise<void> {
    await this.findById(boardId, categoryId);

    // 해당 카테고리를 사용 중인 게시글의 categoryId를 null로 해제
    await this.prisma.post.updateMany({
      where: { categoryId },
      data: { categoryId: null },
    });

    await this.prisma.postCategory.delete({ where: { id: categoryId } });
  }
}
