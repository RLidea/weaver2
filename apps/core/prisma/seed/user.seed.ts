import { Prisma, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { logSeedResult } from './seed-logger';

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
      logSeedResult('User', userData.username, 'created');
    } else {
      logSeedResult('User', userData.username, 'exists');
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

      // Create UserSetting for the newly created user
      await prisma.userSetting.upsert({
        where: { userId: authData.userId },
        update: {},
        create: {
          userId: authData.userId,
          // Default values will be applied by Prisma
        },
      });

      logSeedResult('Auth', authData.email, 'created');
    } else {
      logSeedResult('Auth', authData.email, 'exists');
    }
  });

  await Promise.all(creationPromises);
}
