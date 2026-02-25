import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { logSeedResult } from './seed-logger';

const usersToSeed = [
  {
    id: 'cmbyuak4e00001rjcld47s4u9',
    username: 'admin',
    displayName: '관리자',
    email: 'admin@weaver.com',
  },
  {
    id: 'cmbyuak4m00011rjce4dkz2m2',
    username: 'weaver',
    displayName: '개발자',
    email: 'weaver@weaver.com',
  },
];

const localCredentialsToSeed = [
  {
    password: 'secret!!',
    userId: 'cmbyuak4e00001rjcld47s4u9',
  },
  {
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

export async function seedLocalCredentials(prisma: PrismaClient) {
  const creationPromises = localCredentialsToSeed.map(async (credData) => {
    const existingCredential = await prisma.localCredential.findUnique({
      where: { userId: credData.userId },
    });

    if (!existingCredential) {
      const passwordHash = await bcrypt.hash(credData.password, 10);

      await prisma.localCredential.create({
        data: {
          password: passwordHash,
          isVerified: true,
          userId: credData.userId,
        },
      });

      // Create UserSetting for the newly created user
      await prisma.userSetting.upsert({
        where: { userId: credData.userId },
        update: {},
        create: {
          userId: credData.userId,
          // Default values will be applied by Prisma
        },
      });

      logSeedResult('LocalCredential', credData.userId, 'created');
    } else {
      logSeedResult('LocalCredential', credData.userId, 'exists');
    }
  });

  await Promise.all(creationPromises);
}
