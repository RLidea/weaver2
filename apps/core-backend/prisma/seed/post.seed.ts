import { PrismaClient } from '@prisma/client';
import { logSeedResult } from './seed-logger';

const TEST_POST_TITLE = '자유게시판입니다.';

export async function seedTestPost(prisma: PrismaClient) {
  const existing = await prisma.post.findFirst({
    where: { title: TEST_POST_TITLE },
  });

  if (existing) {
    logSeedResult('Post', TEST_POST_TITLE, 'exists');
    return existing;
  }

  const admin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });
  if (!admin) {
    console.warn('⚠️ admin user not found, skipping test post seed.');
    return null;
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
      authorId: admin.id,
    },
  });

  logSeedResult('Post', post.title, 'created');
  return post;
}

export async function seedFreeboardCategories(prisma: PrismaClient) {
  const freeBoard = await prisma.board.findUnique({ where: { name: 'Free' } });
  if (!freeBoard) {
    console.warn('⚠️ Free board not found, skipping category seed.');
    return;
  }

  const admin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });
  if (!admin) {
    console.warn('⚠️ admin user not found, skipping category seed.');
    return;
  }

  const categoryNames = ['일반', '질문', '공유'];
  const categories: Record<string, string> = {};

  for (const name of categoryNames) {
    const existing = await prisma.postCategory.findFirst({
      where: { boardId: freeBoard.id, name },
    });

    if (existing) {
      logSeedResult('PostCategory', name, 'exists');
      categories[name] = existing.id;
    } else {
      const cat = await prisma.postCategory.create({
        data: { name, boardId: freeBoard.id },
      });
      logSeedResult('PostCategory', name, 'created');
      categories[name] = cat.id;
    }
  }

  // 카테고리 지정 게시글
  const categorizedPosts = [
    {
      title: '[일반] 안녕하세요, 처음 가입했습니다!',
      content: '반갑습니다. 잘 부탁드립니다.',
      categoryName: '일반',
    },
    {
      title: '[질문] Next.js App Router에서 레이아웃은 어떻게 구성하나요?',
      content:
        'App Router를 처음 써보는데 레이아웃 중첩이 헷갈립니다. 도움 부탁드립니다.',
      categoryName: '질문',
    },
    {
      title: '[질문] TypeScript에서 제네릭을 잘 활용하는 방법이 궁금합니다.',
      content: '제네릭을 언제 써야 하는지 기준이 잘 안 잡혀서요.',
      categoryName: '질문',
    },
    {
      title: '[공유] 유용한 개발 도구 모음',
      content:
        '평소 자주 쓰는 도구들을 공유합니다.\n- Raycast\n- TablePlus\n- Fig',
      categoryName: '공유',
    },
  ];

  for (const p of categorizedPosts) {
    const existing = await prisma.post.findFirst({ where: { title: p.title } });
    if (existing) {
      logSeedResult('Post (categorized)', p.title, 'exists');
      continue;
    }

    await prisma.post.create({
      data: {
        title: p.title,
        content: p.content,
        boardId: freeBoard.id,
        authorId: admin.id,
        categoryId: categories[p.categoryName],
      },
    });
    logSeedResult('Post (categorized)', p.title, 'created');
  }
}
