import { PrismaClient } from '@prisma/client';
import { logSeedResult } from './seed-logger';

const DEFAULT_EMOJIS = [
  { code: 'thumbs_up', name: '좋아요', unicode: '👍' },
  { code: 'heart', name: '하트', unicode: '❤️' },
  { code: 'laugh', name: '웃김', unicode: '😂' },
  { code: 'wow', name: '놀람', unicode: '😮' },
  { code: 'sad', name: '슬픔', unicode: '😢' },
  { code: 'fire', name: '불꽃', unicode: '🔥' },
];

export async function seedEmojis(prisma: PrismaClient) {
  for (const emoji of DEFAULT_EMOJIS) {
    const existing = await prisma.emoji.findUnique({
      where: { code: emoji.code },
    });

    if (existing) {
      logSeedResult('Emoji', emoji.code, 'exists');
    } else {
      await prisma.emoji.create({
        data: {
          code: emoji.code,
          name: emoji.name,
          unicode: emoji.unicode,
          isActive: true,
        },
      });
      logSeedResult('Emoji', emoji.code, 'created');
    }
  }
}
