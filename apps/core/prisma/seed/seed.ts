import { PrismaClient } from '@prisma/client';
import { seedAuths, seedUsers } from './user.seed';
import { seedEmailTemplates } from './email-templates.seed';
import { logSeedResult } from './seed-logger';
const prisma = new PrismaClient();

async function main() {
  console.log('Starting the seeding process...');

  // Seed Terms and Conditions
  let terms1 = await prisma.termsAndConditions.findUnique({
    where: { version: 1 },
  });
  if (terms1) {
    logSeedResult('TermsAndConditions', terms1.title, 'exists');
  } else {
    terms1 = await prisma.termsAndConditions.create({
      data: {
        version: 1,
        title: '서비스 이용 약관 v1.0',
        content: '이것은 서비스 이용 약관 v1.0의 내용입니다.',
        effectiveAt: new Date('2023-01-01T00:00:00Z'),
      },
    });
    logSeedResult('TermsAndConditions', terms1.title, 'created');
  }

  let terms2 = await prisma.termsAndConditions.findUnique({
    where: { version: 2 },
  });
  if (terms2) {
    logSeedResult('TermsAndConditions', terms2.title, 'exists');
  } else {
    terms2 = await prisma.termsAndConditions.create({
      data: {
        version: 2,
        title: '서비스 이용 약관 v2.0',
        content: '이것은 서비스 이용 약관 v2.0의 내용입니다. (2024년 갱신)',
        effectiveAt: new Date('2024-01-01T00:00:00Z'),
      },
    });
    logSeedResult('TermsAndConditions', terms2.title, 'created');
  }

  let privacy1 = await prisma.termsAndConditions.findUnique({
    where: { version: 101 },
  });
  if (privacy1) {
    logSeedResult('TermsAndConditions', privacy1.title, 'exists');
  } else {
    privacy1 = await prisma.termsAndConditions.create({
      data: {
        version: 101,
        title: '개인정보 처리 방침 v1.0',
        content: '이것은 개인정보 처리 방침 v1.0의 내용입니다.',
        effectiveAt: new Date('2023-01-01T00:00:00Z'),
      },
    });
    logSeedResult('TermsAndConditions', privacy1.title, 'created');
  }

  // Seed Boards
  const boardsToSeed = [
    { name: 'Notice', description: '공지사항을 안내하는 게시판입니다.' },
    {
      name: 'Free',
      description: '자유롭게 이야기를 나눌 수 있는 게시판입니다.',
    },
    { name: 'Q&A', description: '질문과 답변을 주고받는 게시판입니다.' },
  ];

  for (const boardData of boardsToSeed) {
    let board = await prisma.board.findUnique({
      where: { name: boardData.name },
    });
    if (board) {
      logSeedResult('Board', board.name, 'exists');
    } else {
      board = await prisma.board.create({ data: boardData });
      logSeedResult('Board', board.name, 'created');
    }
  }

  await seedUsers(prisma);
  await seedAuths(prisma);
  await seedEmailTemplates();
  console.log('Seeding process completed successfully.');
}

main()
  .catch((e) => {
    console.error('An error occurred during the seeding process:', e);
    process.exit(1);
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  .finally(async () => {
    await prisma.$disconnect();
  });
