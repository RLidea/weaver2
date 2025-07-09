import { PrismaClient } from '@prisma/client';
import { seedAuths, seedUsers } from './user.seed';
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

  await seedUsers(prisma);
  await seedAuths(prisma);
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
