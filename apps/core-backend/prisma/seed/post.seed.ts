import { PrismaClient } from '@prisma/client';
import { logSeedResult } from './seed-logger';

const FREE_BOARD_ID = '95c87de7-a1e5-4a3b-83ac-ebeec1a11d31';
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

  const post = await prisma.post.create({
    data: {
      title: TEST_POST_TITLE,
      content: '자유 게시판입니다.\n\n자유롭게 글을 남겨보세요!',
      boardId: FREE_BOARD_ID,
      authorId: ADMIN_USER_ID,
    },
  });

  logSeedResult('Post', post.title, 'created');
  return post;
}
