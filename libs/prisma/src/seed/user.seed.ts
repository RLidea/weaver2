import { Prisma, PrismaClient, Role } from '@prisma/client';

const usersToSeed: Prisma.UsersCreateInput[] = [
  {
    id: 'cmbyuak4e00001rjcld47s4u9',
    username: 'admin',
    displayName: '관리자',
    role: Role.ADMIN,
  },
  {
    id: 'cmbyuak4m00011rjce4dkz2m2',
    username: 'weaver',
    displayName: '개발자',
    role: Role.DEVELOPER,
  },
];

async function seedUsers(prisma: PrismaClient) {
  const creationPromises = usersToSeed.map(async (userData) => {
    const existingUser = await prisma.users.findUnique({
      where: { username: userData.username },
    });

    if (!existingUser) {
      await prisma.users.create({
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
