/**
 * 이메일 대소문자 통합 테스트 — 실제 DB(마이그레이션의 CHECK 제약 포함)에서 잰다.
 *
 * `Victim@x.com` 과 `victim@x.com` 이 다른 계정이 되면 가입 충돌을 피해 같은 사람의 이메일을
 * 선점할 수 있다. 이메일은 소문자로 저장하고 정확 일치로 비교한다(ILIKE 를 쓰지 않는다 —
 * `%`·`_` 가 와일드카드가 되므로).
 */
import { ConflictException, INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@weaver2/prisma';
import {
  createTestApp,
  closeTestApp,
  getTestingModule,
} from './helpers/test-app.helper';
import { loginAs } from './helpers/auth.helper';
import { SignUpCommand } from '../../src/core/auth/repositories/sign-up.command';
import { CheckExistingUserQuery } from '../../src/core/user/repositories/check-existing-user.query';

const TEST_PASSWORD = 'TestPass1234!';

describe('Email case (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = getTestingModule().get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await closeTestApp();
  });

  async function createVerifiedUser(email: string) {
    const user = await SignUpCommand(prisma, {
      email,
      username: `ec_${Date.now()}_${createdUserIds.length}`,
      displayName: `ec ${Date.now()} ${createdUserIds.length}`,
      hashedPassword: await bcrypt.hash(TEST_PASSWORD, 10),
    });
    await prisma.localCredential.update({
      where: { userId: user.id },
      data: { isVerified: true },
    });
    createdUserIds.push(user.id);
    return user;
  }

  it('대소문자가 섞인 이메일로 가입해도 소문자로 저장된다', async () => {
    const stamp = Date.now();
    const user = await createVerifiedUser(
      ` Mixed_${stamp}@Integration-Test.LOCAL `,
    );

    expect(user.email).toBe(`mixed_${stamp}@integration-test.local`);
  });

  it('대소문자만 바꾼 이메일로 다시 가입하려 하면 충돌', async () => {
    const stamp = Date.now();
    await createVerifiedUser(`dup_${stamp}@integration-test.local`);

    await expect(
      CheckExistingUserQuery(prisma, {
        email: `DUP_${stamp}@Integration-Test.local`,
        username: `other_${stamp}`,
        displayName: `other ${stamp}`,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('로그인은 대소문자를 가리지 않는다', async () => {
    const stamp = Date.now();
    await createVerifiedUser(`login_${stamp}@integration-test.local`);

    const res = await loginAs(
      app,
      `LOGIN_${stamp}@Integration-Test.local`,
      TEST_PASSWORD,
    );

    expect(res.status).toBe(201);
  });

  it('% · _ 는 와일드카드가 아니다 — 남의 계정을 찾지도, 실패 횟수를 올리지도 않는다', async () => {
    const stamp = Date.now();
    const victim = await createVerifiedUser(
      `axb_${stamp}@integration-test.local`,
    );

    const wildcard = await loginAs(app, `%@integration-test.local`, 'nope');
    const underscore = await loginAs(
      app,
      `a_b_${stamp}@integration-test.local`,
      'nope',
    );

    expect(wildcard.status).toBe(401);
    expect(underscore.status).toBe(401);
    const credential = await prisma.localCredential.findUnique({
      where: { userId: victim.id },
    });
    expect(credential?.failedAttempts ?? 0).toBe(0);
  });

  it('DB 가 대문자 이메일을 거절한다 (CHECK 제약)', async () => {
    const stamp = Date.now();
    await expect(
      prisma.user.create({
        data: {
          email: `Upper_${stamp}@integration-test.local`,
          username: `upper_${stamp}`,
          displayName: `upper ${stamp}`,
        },
      }),
    ).rejects.toThrow();
  });
});
