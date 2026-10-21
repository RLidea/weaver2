import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@weaver2/prisma';
import { OAuthService } from './oauth.service';
import { AuthModeConfig } from '../auth-mode';
import { OAuthProviderRegistry } from './oauth-provider.registry';
import { OAuthProvider } from './interfaces/oauth-provider.interface';

jest.mock('../repositories/find-oauth-account.query', () => ({
  FindOAuthAccountQuery: jest.fn(),
}));
jest.mock('../repositories/find-user-by-email.query', () => ({
  FindUserByEmailQuery: jest.fn(),
}));
jest.mock('../repositories/create-oauth-user.command', () => ({
  CreateOAuthUserCommand: jest.fn(),
}));

import { FindOAuthAccountQuery } from '../repositories/find-oauth-account.query';
import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';
import { CreateOAuthUserCommand } from '../repositories/create-oauth-user.command';

describe('OAuthService', () => {
  let env: Record<string, string | undefined>;
  let registry: OAuthProviderRegistry;
  let service: OAuthService;
  let prisma: { user: { findFirst: jest.Mock; update: jest.Mock } };

  type FakeProvider = OAuthProvider & {
    mocks: { exchangeCodeForTokens: jest.Mock; getUserProfile: jest.Mock };
  };

  const fakeProvider = (name: string, email: string): FakeProvider => {
    const mocks = {
      exchangeCodeForTokens: jest.fn().mockResolvedValue({ accessToken: 'at' }),
      getUserProfile: jest.fn().mockResolvedValue({
        provider: name,
        providerId: 'sub-1',
        email,
        displayName: 'Jane',
      }),
    };
    return {
      name,
      getAuthorizationUrl: (state: string) =>
        `https://idp.example/${name}?state=${state}`,
      exchangeCodeForTokens: mocks.exchangeCodeForTokens,
      getUserProfile: mocks.getUserProfile,
      mocks,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    env = {
      OAUTH_FAILURE_REDIRECT_URL: '/fail',
      OAUTH_SUCCESS_REDIRECT_URL: '/ok',
    };
    registry = new OAuthProviderRegistry();
    const config = { get: (k: string) => env[k] } as unknown as ConfigService;
    prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    service = new OAuthService(
      prisma as unknown as PrismaService,
      config,
      registry,
    );
  });

  describe('getEnabledProviders', () => {
    it('등록됐고 client id 가 채워진 provider 만 true 다', () => {
      registry.register(fakeProvider('google', 'a@b.c'));
      registry.register(fakeProvider('kakao', 'a@b.c'));
      env.GOOGLE_CLIENT_ID = 'gid';
      // kakao 는 등록됐지만 client id 가 비어 있음, apple 은 등록 안 됨(APPLE_OAUTH_ENABLED 꺼짐)
      env.APPLE_CLIENT_ID = 'aid';

      expect(service.getEnabledProviders()).toEqual({
        sso: false,
        password: true,
        google: true,
        kakao: false,
        naver: false,
        apple: false,
      });
    });
  });

  describe('getEnabledProviders — 파생 프로젝트 확장', () => {
    it('AUTH_PROVIDER_EXTRAS 의 칸을 더하되 upstream 칸은 덮어쓰지 못한다', () => {
      const config = { get: (k: string) => env[k] } as unknown as ConfigService;
      const extended = new OAuthService(
        prisma as unknown as PrismaService,
        config,
        registry,
        [
          () => ({ emailCode: true }),
          () => ({ password: false, google: true }),
        ],
      );

      expect(extended.getEnabledProviders()).toEqual({
        emailCode: true,
        sso: false,
        password: true,
        google: false,
        kakao: false,
        naver: false,
        apple: false,
      });
    });
  });

  it('깨진 확장 함수 하나가 응답 전체를 망치지 않는다', () => {
    const config = { get: (k: string) => env[k] } as unknown as ConfigService;
    const extended = new OAuthService(
      prisma as unknown as PrismaService,
      config,
      registry,
      [
        () => {
          throw new Error('boom');
        },
        () => ({ emailCode: true }),
      ],
    );

    expect(extended.getEnabledProviders()).toMatchObject({
      emailCode: true,
      password: true,
    });
  });

  describe('getEnabledProviders — AUTH_MODE=sso', () => {
    it('sso 면 로컬 수단은 모두 false, sso 와 accountUrl 이 실린다', () => {
      registry.register(fakeProvider('google', 'a@b.c'));
      env.GOOGLE_CLIENT_ID = 'gid';
      const config = { get: (k: string) => env[k] } as unknown as ConfigService;
      const sso = new OAuthService(
        prisma as unknown as PrismaService,
        config,
        registry,
        [() => ({ password: true, emailCode: true })],
        {
          mode: 'sso',
          sso: { accountUrl: 'https://accounts.example.com/me' },
        } as AuthModeConfig,
      );

      expect(sso.getEnabledProviders()).toEqual({
        emailCode: true,
        sso: true,
        password: false,
        google: false,
        kakao: false,
        naver: false,
        apple: false,
        accountUrl: 'https://accounts.example.com/me',
      });
    });

    it('accountUrl 이 없으면 칸을 싣지 않는다', () => {
      const config = { get: (k: string) => env[k] } as unknown as ConfigService;
      const sso = new OAuthService(
        prisma as unknown as PrismaService,
        config,
        registry,
        [],
        { mode: 'sso', sso: {} } as AuthModeConfig,
      );
      expect(sso.getEnabledProviders()).not.toHaveProperty('accountUrl');
    });
  });

  describe('getAuthorizationUrl', () => {
    it('provider 의 usesFormPost 를 함께 돌려준다', () => {
      registry.register({ ...fakeProvider('apple', ''), usesFormPost: true });
      registry.register(fakeProvider('google', ''));
      expect(service.getAuthorizationUrl('apple').usesFormPost).toBe(true);
      expect(service.getAuthorizationUrl('google').usesFormPost).toBe(false);
    });
  });

  describe('resolveCallbackUser', () => {
    it('콜백의 user 를 provider 의 getUserProfile 로 넘긴다', async () => {
      const provider = fakeProvider('apple', '');
      registry.register(provider);
      (FindOAuthAccountQuery as jest.Mock).mockResolvedValue(null);

      await service
        .resolveCallbackUser('apple', 'code', 'st', 'st', {
          user: '{"name":{"firstName":"Jane"}}',
        })
        .catch(() => undefined);

      expect(provider.mocks.getUserProfile).toHaveBeenCalledWith(
        { accessToken: 'at' },
        { user: '{"name":{"firstName":"Jane"}}' },
      );
    });

    it('email 없는 신규 가입은 사용자를 만들지 않고 실패한다', async () => {
      registry.register(fakeProvider('apple', ''));
      (FindOAuthAccountQuery as jest.Mock).mockResolvedValue(null);

      await expect(
        service.resolveCallbackUser('apple', 'code', 'st', 'st'),
      ).rejects.toThrow();
      expect(FindUserByEmailQuery).not.toHaveBeenCalled();
      expect(CreateOAuthUserCommand).not.toHaveBeenCalled();
    });

    it('state 가 쿠키와 다르면 code 를 교환하지 않는다', async () => {
      const provider = fakeProvider('apple', 'a@b.c');
      registry.register(provider);

      await expect(
        service.resolveCallbackUser('apple', 'code', 'st', 'other'),
      ).rejects.toThrow(/state mismatch/);
      expect(provider.mocks.exchangeCodeForTokens).not.toHaveBeenCalled();
    });

    it('연동이 남아 있어도 탈퇴한 사람이면 로그인 길이 아니다', async () => {
      registry.register(fakeProvider('google', 'a@b.c'));
      (FindOAuthAccountQuery as jest.Mock).mockResolvedValue({
        userId: 'u1',
        user: { deletedAt: new Date() },
      });

      await expect(
        service.resolveCallbackUser('google', 'code', 'st', 'st'),
      ).rejects.toThrow(/ACCOUNT_DELETED/);
    });

    it('공급자가 검증하지 않은 이메일로는 가입시키지 않는다 — 남의 주소 선점 차단', async () => {
      const provider = fakeProvider('kakao', 'victim@b.c');
      provider.mocks.getUserProfile.mockResolvedValue({
        provider: 'kakao',
        providerId: 'sub-7',
        email: 'victim@b.c',
        emailVerified: false,
        displayName: 'X',
      });
      registry.register(provider);
      (FindOAuthAccountQuery as jest.Mock).mockResolvedValue(null);

      await expect(
        service.resolveCallbackUser('kakao', 'code', 'st', 'st'),
      ).rejects.toThrow(/verified email/);
      expect(CreateOAuthUserCommand).not.toHaveBeenCalled();
    });

    it('신규 사용자는 공급자의 이메일 검증 여부를 그대로 받는다', async () => {
      const provider = fakeProvider('google', 'new@b.c');
      provider.mocks.getUserProfile.mockResolvedValue({
        provider: 'google',
        providerId: 'sub-9',
        email: 'new@b.c',
        emailVerified: true,
        displayName: 'New',
      });
      registry.register(provider);
      (FindOAuthAccountQuery as jest.Mock).mockResolvedValue(null);
      (FindUserByEmailQuery as jest.Mock).mockResolvedValue(null);
      (CreateOAuthUserCommand as jest.Mock).mockResolvedValue({ userId: 'u9' });

      await expect(
        service.resolveCallbackUser('google', 'code', 'st', 'st'),
      ).resolves.toEqual({ userId: 'u9', providerId: 'sub-9' });
      expect(CreateOAuthUserCommand).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ emailVerified: true }),
      );
    });

    it('공급자 토큰은 프로필을 받는 데만 쓰고 저장으로 넘기지 않는다', async () => {
      const provider = fakeProvider('google', 'new@b.c');
      provider.mocks.exchangeCodeForTokens.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        tokenExpiry: new Date(),
      });
      provider.mocks.getUserProfile.mockResolvedValue({
        provider: 'google',
        providerId: 'sub-9',
        email: 'new@b.c',
        emailVerified: true,
        displayName: 'New',
      });
      registry.register(provider);
      (FindOAuthAccountQuery as jest.Mock).mockResolvedValue(null);
      (FindUserByEmailQuery as jest.Mock).mockResolvedValue(null);
      (CreateOAuthUserCommand as jest.Mock).mockResolvedValue({ userId: 'u9' });

      await service.resolveCallbackUser('google', 'code', 'st', 'st');

      const [, options] = (CreateOAuthUserCommand as jest.Mock).mock.calls[0];
      expect(JSON.stringify(options)).not.toMatch(/"at"|"rt"/);
    });

    it('콜백 로그에 이메일을 남기지 않는다', async () => {
      const debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
      registry.register(fakeProvider('google', 'secret@b.c'));
      (FindOAuthAccountQuery as jest.Mock).mockResolvedValue({
        userId: 'u1',
        user: { deletedAt: null },
      });

      await service.resolveCallbackUser('google', 'code', 'st', 'st');

      expect(JSON.stringify(debug.mock.calls)).not.toContain('secret@b.c');
      debug.mockRestore();
    });
  });

  describe('acceptsFormPost', () => {
    it('form_post provider 만 true, 등록 안 된 provider 는 false', () => {
      registry.register({ ...fakeProvider('apple', ''), usesFormPost: true });
      registry.register(fakeProvider('google', ''));
      expect(service.acceptsFormPost('apple')).toBe(true);
      expect(service.acceptsFormPost('google')).toBe(false);
      expect(service.acceptsFormPost('nope')).toBe(false);
    });
  });

  describe('신규 가입의 displayName', () => {
    const signUpWithName = async (displayName: string) => {
      const provider = fakeProvider('google', 'new@b.c');
      provider.mocks.getUserProfile.mockResolvedValue({
        provider: 'google',
        providerId: 'sub-1',
        email: 'new@b.c',
        emailVerified: true,
        displayName,
      });
      registry.register(provider);
      (FindOAuthAccountQuery as jest.Mock).mockResolvedValue(null);
      (FindUserByEmailQuery as jest.Mock).mockResolvedValue(null);
      (CreateOAuthUserCommand as jest.Mock).mockResolvedValue({ userId: 'u1' });

      await expect(
        service.resolveCallbackUser('google', 'code', 'st', 'st'),
      ).resolves.toMatchObject({ userId: 'u1' });
      const [, options] = (CreateOAuthUserCommand as jest.Mock).mock
        .calls[0] as [unknown, { displayName: string }];
      return options.displayName;
    };

    it('이미 쓰는 이름이면 숫자를 붙인다', async () => {
      // username 확인(첫 호출)은 비어 있고, displayName 'Jane' 은 이미 있음
      prisma.user.findFirst.mockImplementation(
        ({ where }: { where: { displayName?: string } }) =>
          Promise.resolve(where.displayName === 'Jane' ? { id: 'x' } : null),
      );
      await expect(signUpWithName('Jane')).resolves.toBe('Jane2');
    });

    it('제어문자를 지우고 길이를 자른다', async () => {
      const name = await signUpWithName(
        `  Ja\u0000ne\u200b ${'x'.repeat(100)}`,
      );
      expect(name.startsWith('Jane ')).toBe(true);
      expect(name.length).toBeLessThanOrEqual(30);
    });

    it('예약된 이름이나 빈 이름은 user 로 바꾼다', async () => {
      await expect(signUpWithName('   ')).resolves.toBe('user');
    });
  });
});
