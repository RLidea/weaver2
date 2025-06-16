// libs/prisma/src/seed.ts
import { PrismaClient } from '@prisma/client';
import { CreateUserSeed } from './seed/user.seed';
const prisma = new PrismaClient();

async function main() {
  console.log('Starting the seeding process...');

  await CreateUserSeed(prisma);
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
