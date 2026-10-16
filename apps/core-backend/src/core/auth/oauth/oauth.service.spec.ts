import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@weaver2/prisma';
import { Response } from 'express';
import { OAuthService } from './oauth.service';
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
jest.mock('../repositories/create-refresh-token.command', () => ({
  CreateRefreshTokenCommand: jest.fn(),
}));
jest.mock('../utils/auth-cookie.util', () => ({
  setAuthCookies: jest.fn(),
}));

import { FindOAuthAccountQuery } from '../repositories/find-oauth-account.query';
import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';
import { CreateOAuthUserCommand } from '../repositories/create-oauth-user.command';

describe('OAuthService', () => {
  let env: Record<string, string | undefined>;
  let registry: OAuthProviderRegistry;
  let service: OAuthService;
  let res: { redirect: jest.Mock; cookie: jest.Mock };
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
      { sign: () => 'jwt' } as unknown as JwtService,
      config,
      registry,
    );
    res = { redirect: jest.fn(), cookie: jest.fn() };
  });

  describe('getEnabledProviders', () => {
    it('등록됐고 client id 가 채워진 provider 만 true 다', () => {
      registry.register(fakeProvider('google', 'a@b.c'));
      registry.register(fakeProvider('kakao', 'a@b.c'));
      env.GOOGLE_CLIENT_ID = 'gid';
      // kakao 는 등록됐지만 client id 가 비어 있음, apple 은 등록 안 됨(APPLE_OAUTH_ENABLED 꺼짐)
      env.APPLE_CLIENT_ID = 'aid';

      expect(service.getEnabledProviders()).toEqual({
        password: true,
        google: true,
        kakao: false,
        naver: false,
        apple: false,
      });
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

  describe('handleOAuthCallback', () => {
    it('콜백의 user 를 provider 의 getUserProfile 로 넘긴다', async () => {
      const provider = fakeProvider('apple', '');
      registry.register(provider);
      (FindOAuthAccountQuery as jest.Mock).mockResolvedValue(null);

      await service.handleOAuthCallback(
        'apple',
        'code',
        'st',
        'st',
        res as unknown as Response,
        { user: '{"name":{"firstName":"Jane"}}' },
      );

      expect(provider.mocks.getUserProfile).toHaveBeenCalledWith(
        { accessToken: 'at' },
        { user: '{"name":{"firstName":"Jane"}}' },
      );
    });

    it('email 없는 신규 가입은 사용자를 만들지 않고 실패로 보낸다', async () => {
      registry.register(fakeProvider('apple', ''));
      (FindOAuthAccountQuery as jest.Mock).mockResolvedValue(null);

      await service.handleOAuthCallback(
        'apple',
        'code',
        'st',
        'st',
        res as unknown as Response,
      );

      expect(FindUserByEmailQuery).not.toHaveBeenCalled();
      expect(CreateOAuthUserCommand).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/fail');
    });

    it('state 가 쿠키와 다르면 code 를 교환하지 않는다', async () => {
      const provider = fakeProvider('apple', 'a@b.c');
      registry.register(provider);

      await service.handleOAuthCallback(
        'apple',
        'code',
        'st',
        'other',
        res as unknown as Response,
      );

      expect(provider.mocks.exchangeCodeForTokens).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/fail');
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
        displayName,
      });
      registry.register(provider);
      (FindOAuthAccountQuery as jest.Mock).mockResolvedValue(null);
      (FindUserByEmailQuery as jest.Mock).mockResolvedValue(null);
      (CreateOAuthUserCommand as jest.Mock).mockResolvedValue({ userId: 'u1' });

      await service.handleOAuthCallback(
        'google',
        'code',
        'st',
        'st',
        res as unknown as Response,
      );
      expect(res.redirect).toHaveBeenCalledWith('/ok');
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
