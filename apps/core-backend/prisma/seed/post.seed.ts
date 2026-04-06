import { PrismaClient } from '@prisma/client';
import { logSeedResult } from './seed-logger';

const ADMIN_USER_ID = 'cmbyuak4e00001rjcld47s4u9';
const TEST_POST_TITLE = '자유게시판입니다.';

export async function seedTestPost(prisma: PrismaClient) {
  const existing = await prisma.post.findFirst({
    where: { title: TEST_POST_TITLE },
  });

  if (existing) {
    logSeedResult('Post', TEST_POST_TITLE, 'exists');
    return existing;
  }

  const freeBoard = await prisma.board.findUnique({ where: { name: 'Free' } });
  if (!freeBoard) {
    console.warn('⚠️ Free board not found, skipping test post seed.');
    return null;
  }

  const post = await prisma.post.create({
    data: {
      title: TEST_POST_TITLE,
      content: '자유 게시판입니다.\n\n자유롭게 글을 남겨보세요!',
      boardId: freeBoard.id,
      authorId: ADMIN_USER_ID,
    },
  });

  logSeedResult('Post', post.title, 'created');
  return post;
}
