/**
 * JwtStrategy.validate — back-channel 로그아웃이 끝낸 세션의 **이미 발급된 access token** 을 다음 요청에서
 * 거절하는지 못박는다(설계 2026-10-19 sso-client-mode 구현 기록 16).
 *
 * DB 는 안 탄다 — 사용자 행(`user.findFirst`)과 sid 묘비(`oidcRevokedSid.findUnique`)만 바꿔 끼운다.
 */
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@weaver2/prisma';
import { JwtStrategy } from './jwt.strategy';

const USER_ID = 'user-1';
/** 끊은 시각 — 초 경계에서 0.5초 지난 때 */
const REVOKED_AT = new Date(1_760_000_000_500);
const REVOKED_SEC = 1_760_000_000;

describe('JwtStrategy.validate', () => {
  const findFirst = jest.fn();
  const findUnique = jest.fn();
  let strategy: JwtStrategy;

  const userRow = (over: Record<string, unknown> = {}) => ({
    id: USER_ID,
    username: 'alice',
    suspendedUntil: null,
    sessionsRevokedAt: null,
    ssoSubject: 'sub-1',
    userSetting: null,
    ...over,
  });

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterAll(() => jest.restoreAllMocks());

  beforeEach(() => {
    findFirst.mockReset();
    findUnique.mockReset();
    findFirst.mockResolvedValue(userRow());
    findUnique.mockResolvedValue(null);
    strategy = new JwtStrategy(
      {
        user: { findFirst },
        oidcRevokedSid: { findUnique },
      } as unknown as PrismaService,
      new ConfigService({ JWT_SECRET: 'strategy-spec-secret' }),
    );
  });

  it('살아 있는 사용자 → req.user', async () => {
    await expect(
      strategy.validate({ sub: USER_ID, iat: REVOKED_SEC }),
    ).resolves.toMatchObject({ id: USER_ID, isLogin: true });
  });

  it('정지된 사용자는 그대로 거절', async () => {
    findFirst.mockResolvedValue(
      userRow({ suspendedUntil: new Date(Date.now() + 60_000) }),
    );
    await expect(
      strategy.validate({ sub: USER_ID, iat: REVOKED_SEC }),
    ).resolves.toBeNull();
  });

  describe('sub 끊기 — users.sessionsRevokedAt', () => {
    beforeEach(() => {
      findFirst.mockResolvedValue(userRow({ sessionsRevokedAt: REVOKED_AT }));
    });

    it('끊기 전에 발급된 토큰(iat 가 그 초보다 앞)은 거절', async () => {
      await expect(
        strategy.validate({ sub: USER_ID, iat: REVOKED_SEC - 1 }),
      ).resolves.toBeNull();
    });

    it('끊은 바로 그 초에 발급된 토큰은 통과 — 곧바로 다시 로그인한 토큰을 살리는 창', async () => {
      await expect(
        strategy.validate({ sub: USER_ID, iat: REVOKED_SEC }),
      ).resolves.toMatchObject({ id: USER_ID });
    });

    it('끊은 뒤에 발급된 토큰은 통과', async () => {
      await expect(
        strategy.validate({ sub: USER_ID, iat: REVOKED_SEC + 1 }),
      ).resolves.toMatchObject({ id: USER_ID });
    });

    it('iat 가 없는 토큰은 거절 — 언제 받은 것인지 알 수 없다', async () => {
      await expect(strategy.validate({ sub: USER_ID })).resolves.toBeNull();
    });

    it('조회를 늘리지 않는다 — sid 없는 토큰은 묘비를 읽지 않는다', async () => {
      await strategy.validate({ sub: USER_ID, iat: REVOKED_SEC + 1 });
      expect(findFirst).toHaveBeenCalledTimes(1);
      expect(findUnique).not.toHaveBeenCalled();
    });
  });

  it('sessionsRevokedAt 이 없으면 iat 없는 토큰도 통과(예전 그대로)', async () => {
    await expect(strategy.validate({ sub: USER_ID })).resolves.toMatchObject({
      id: USER_ID,
    });
  });

  describe('sid 끊기 — oidc_revoked_sids 묘비', () => {
    const payload = { sub: USER_ID, sid: 'sid-1', iat: REVOKED_SEC };

    it('sid 가 없는 토큰은 묘비를 읽지 않는다', async () => {
      await strategy.validate({ sub: USER_ID, iat: REVOKED_SEC });
      expect(findUnique).not.toHaveBeenCalled();
    });

    it('살아 있는 묘비가 있으면 거절', async () => {
      findUnique.mockResolvedValue({
        sid: 'sid-1',
        sub: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      await expect(strategy.validate(payload)).resolves.toBeNull();
      expect(findUnique).toHaveBeenCalledWith({ where: { sid: 'sid-1' } });
    });

    it('묘비가 그 사람(sub)의 것이면 거절', async () => {
      findUnique.mockResolvedValue({
        sid: 'sid-1',
        sub: 'sub-1',
        expiresAt: new Date(Date.now() + 60_000),
      });
      await expect(strategy.validate(payload)).resolves.toBeNull();
    });

    it('묘비의 sub 가 다른 사람이면 통과 — 겹친 sid 로 엉뚱한 사람을 끊지 않는다', async () => {
      findUnique.mockResolvedValue({
        sid: 'sid-1',
        sub: 'sub-other',
        expiresAt: new Date(Date.now() + 60_000),
      });
      await expect(strategy.validate(payload)).resolves.toMatchObject({
        id: USER_ID,
      });
    });

    it('기한이 지난 묘비는 통과', async () => {
      findUnique.mockResolvedValue({
        sid: 'sid-1',
        sub: null,
        expiresAt: new Date(Date.now() - 1),
      });
      await expect(strategy.validate(payload)).resolves.toMatchObject({
        id: USER_ID,
      });
    });

    it('묘비가 없으면 통과', async () => {
      await expect(strategy.validate(payload)).resolves.toMatchObject({
        id: USER_ID,
      });
    });
  });
});
