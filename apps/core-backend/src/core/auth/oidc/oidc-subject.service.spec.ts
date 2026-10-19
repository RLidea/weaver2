import { Prisma, PrismaService } from '@weaver2/prisma';
import { OidcSubjectService } from './oidc-subject.service';
import { OidcError } from './oidc-client';
import { OidcUserHooks } from './oidc-user-hooks';

const META = { sub: 'sub-1', lang: 'ko', entry: 'admin' };
const CLAIMS = {
  sub: 'sub-1',
  email: 'Person@Example.com',
  email_verified: true,
  name: 'Person',
};

function p2002() {
  return new Prisma.PrismaClientKnownRequestError('dup', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('OidcSubjectService', () => {
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'new' }),
        update: jest.fn(),
      },
    };
  });

  const make = (hooks?: OidcUserHooks) =>
    new OidcSubjectService(prisma as unknown as PrismaService, hooks);

  it('같은 이메일의 행이 있으면 onConflict(그 행, sub) 를 부르고 sso_conflict — 훅이 던져도 같다', async () => {
    prisma.user.findFirst.mockResolvedValueOnce({ id: 'existing' });
    const onConflict = jest.fn().mockRejectedValue(new Error('hook down'));
    const err = await make({ onConflict })
      .resolve(CLAIMS, META)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OidcError);
    expect((err as OidcError).code).toBe('sso_conflict');
    expect(onConflict).toHaveBeenCalledWith('existing', 'sub-1', {
      ...META,
      created: false,
    });
    // 이메일은 정규화해서 찾는다
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: 'person@example.com', deletedAt: null },
      select: { id: true },
    });
  });

  it('names 훅이 있으면 그 이름으로 만든다', async () => {
    const names = jest
      .fn()
      .mockResolvedValue({ username: 'u', displayName: 'd' });
    await expect(make({ names }).resolve(CLAIMS, META)).resolves.toEqual({
      userId: 'new',
      created: true,
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'person@example.com',
        username: 'u',
        displayName: 'd',
        ssoSubject: 'sub-1',
        emailVerifiedAt: expect.any(Date) as Date,
      }) as object,
      select: { id: true },
    });
  });

  it('names 훅이 던지면 기본 생성기로', async () => {
    const names = jest.fn().mockRejectedValue(new Error('boom'));
    await make({ names }).resolve(CLAIMS, META);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: 'sso_sub-1',
          displayName: 'Person',
        }) as object,
      }),
    );
  });

  it('P2002 면 한 번만 다시 찾는다 — 두 번째도 부딪히면 sso_failed', async () => {
    prisma.user.create.mockRejectedValue(p2002());
    const err = await make()
      .resolve(CLAIMS, META)
      .catch((e: unknown) => e);
    expect((err as OidcError).code).toBe('sso_failed');
    expect(prisma.user.create).toHaveBeenCalledTimes(2);
  });

  it('P2002 뒤 다시 찾아 sub 로 이어진 행이 보이면 그 행', async () => {
    prisma.user.create.mockRejectedValueOnce(p2002());
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'raced',
      email: 'person@example.com',
      deletedAt: null,
    });
    await expect(make().resolve(CLAIMS, META)).resolves.toEqual({
      userId: 'raced',
      created: false,
    });
  });

  it('afterSignIn 훅이 던져도 삼킨다', async () => {
    const afterSignIn = jest.fn().mockRejectedValue(new Error('boom'));
    await expect(
      make({ afterSignIn }).afterSignIn('u1', { ...META, created: true }),
    ).resolves.toBeUndefined();
    expect(afterSignIn).toHaveBeenCalled();
  });

  it('로그에 이메일을 남기지 않는다', async () => {
    const logs: string[] = [];
    const service = make();
    const logger = (service as unknown as { logger: Record<string, unknown> })
      .logger;
    for (const level of ['log', 'warn', 'error', 'debug']) {
      logger[level] = (m: string) => logs.push(m);
    }
    prisma.user.findFirst.mockResolvedValueOnce({ id: 'existing' });
    await service.resolve(CLAIMS, META).catch(() => undefined);
    await service.resolve({ ...CLAIMS, sub: 'sub-2' }, META);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.join('\n').toLowerCase()).not.toContain('person@example.com');
  });
});
