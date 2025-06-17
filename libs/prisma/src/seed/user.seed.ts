import { Prisma, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const usersToSeed: Prisma.UserCreateInput[] = [
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

const authsToSeed = [
  {
    email: 'admin@weaver.com',
    password: 'secret!!',
    userId: 'cmbyuak4e00001rjcld47s4u9',
  },
  {
    email: 'weaver@weaver.com',
    password: 'secret!!',
    userId: 'cmbyuak4m00011rjce4dkz2m2',
  },
];

export async function seedUsers(prisma: PrismaClient) {
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

export async function seedAuths(prisma: PrismaClient) {
  const creationPromises = authsToSeed.map(async (authData) => {
    const existingAuth = await prisma.auth.findUnique({
      where: { email: authData.email },
    });

    if (!existingAuth) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const passwordHash = await bcrypt.hash(authData.password, 10);

      await prisma.auth.create({
        data: {
          email: authData.email,
          password: passwordHash,
          isVerified: true,
          user: {
            connect: { id: authData.userId },
          },
        },
      });

      console.log(`✅ Auth for '${authData.email}' created!`);
    } else {
      console.log(`⚠️ Auth for '${authData.email}' already exists.`);
    }
  });

  await Promise.all(creationPromises);
}
