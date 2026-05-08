import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

// ── Queries ──────────────────────────────────────────

export async function FindAllEmojisQuery(
  prisma: Db,
  options: { includeInactive?: boolean } = {},
) {
  return prisma.emoji.findMany({
    where: options.includeInactive ? undefined : { isActive: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function FindEmojiByIdQuery(prisma: Db, id: string) {
  return prisma.emoji.findUnique({ where: { id } });
}

export async function FindEmojiByCodeQuery(prisma: Db, code: string) {
  return prisma.emoji.findUnique({ where: { code } });
}

// ── Commands ─────────────────────────────────────────

export async function CreateEmojiCommand(
  prisma: Db,
  data: Prisma.EmojiCreateInput,
) {
  return prisma.emoji.create({ data });
}

export async function UpdateEmojiCommand(
  prisma: Db,
  id: string,
  data: Prisma.EmojiUpdateInput,
) {
  return prisma.emoji.update({ where: { id }, data });
}

export async function DeleteEmojiCommand(prisma: Db, id: string) {
  return prisma.emoji.delete({ where: { id } });
}
