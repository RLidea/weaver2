import { Prisma, PrismaClient, Role } from '@prisma/client';

const usersToSeed: Prisma.UserCreateInput[] = [
  {
    username: 'admin',
    displayName: '관리자',
    role: Role.ADMIN,
  },
  {
    username: 'weaver',
    displayName: '개발자',
    role: Role.DEVELOPER,
  },
];

async function seedUsers(prisma: PrismaClient) {
  const creationPromises = usersToSeed.map(async (userData) => {
    const existingUser = await prisma.user.findUnique({
      where: { username: userData.username },
    });

    if (!existingUser) {
      await prisma.user.create({
        data: userData,
      });
      console.log(`✅ User '${userData.username}' created!`);
    } else {
      console.log(`⚠️ User '${userData.username}' already exists.`);
    }
  });

  await Promise.all(creationPromises);
}

export { seedUsers as CreateUserSeed };
