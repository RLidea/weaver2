import { Prisma, PrismaClient } from '@prisma/client';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

type Db = PrismaClient | Prisma.TransactionClient;

// ── Queries ──────────────────────────────────────────

export async function FindCategoryByIdQuery(prisma: Db, id: string) {
  return prisma.postCategory.findUnique({ where: { id } });
}

export async function FindCategoryByBoardAndNameQuery(
  prisma: Db,
  boardId: string,
  name: string,
) {
  return prisma.postCategory.findUnique({
    where: { boardId_name: { boardId, name } },
  });
}

export async function FindCategoriesByBoardQuery(prisma: Db, boardId: string) {
  return prisma.postCategory.findMany({
    where: { boardId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

// ── Commands ─────────────────────────────────────────

export async function CreateCategoryCommand(
  prisma: Db,
  boardId: string,
  dto: CreateCategoryDto,
) {
  return prisma.postCategory.create({
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

export async function UpdateCategoryCommand(
  prisma: Db,
  id: string,
  data: UpdateCategoryDto,
) {
  return prisma.postCategory.update({
    where: { id },
    data: data as Prisma.PostCategoryUpdateInput,
  });
}

export async function DeleteCategoryCommand(prisma: Db, id: string) {
  return prisma.postCategory.delete({ where: { id } });
}

/**
 * 카테고리 삭제 전, 해당 카테고리를 참조하는 게시글의 categoryId를 null로 해제.
 */
export async function ClearPostsCategoryCommand(prisma: Db, categoryId: string) {
  return prisma.post.updateMany({
    where: { categoryId },
    data: { categoryId: null },
  });
}
