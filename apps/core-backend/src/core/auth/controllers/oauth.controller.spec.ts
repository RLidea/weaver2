import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { OAuthController } from './oauth.controller';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { OAuthService } from '../oauth/oauth.service';
import {
  AccountSuspendedException,
  SignInCompletionService,
} from '../services/sign-in-completion.service';

describe('OAuthController', () => {
  let service: {
    getAuthorizationUrl: jest.Mock;
    acceptsFormPost: jest.Mock;
    resolveCallbackUser: jest.Mock;
  };
  let completion: { complete: jest.Mock };
  let controller: OAuthController;
  let res: { redirect: jest.Mock; cookie: jest.Mock; clearCookie: jest.Mock };

  const reqWithState = (state?: string) =>
    ({ cookies: state ? { oauth_state: state } : {} }) as unknown as Request;

  beforeEach(() => {
    service = {
      getAuthorizationUrl: jest.fn(),
      acceptsFormPost: jest.fn(),
      resolveCallbackUser: jest
        .fn()
        .mockResolvedValue({ userId: 'user-1', providerId: 'g-1' }),
    };
    completion = {
      complete: jest.fn().mockResolvedValue({ twoFactorRequired: false }),
    };
    const env: Record<string, string> = {
      OAUTH_FAILURE_REDIRECT_URL: '/fail',
      OAUTH_SUCCESS_REDIRECT_URL: '/ok',
      OAUTH_TWO_FACTOR_REDIRECT_URL: '/login?step=2fa',
    };
    controller = new OAuthController(
      service as unknown as OAuthService,
      { get: (k: string) => env[k] } as unknown as ConfigService,
      completion as unknown as SignInCompletionService,
    );
    res = { redirect: jest.fn(), cookie: jest.fn(), clearCookie: jest.fn() };
  });

  describe('redirectToProvider', () => {
    it('form_post provider 의 state 쿠키는 SameSite=None; Secure', () => {
      service.getAuthorizationUrl.mockReturnValue({
        url: 'https://idp',
        state: 's',
        usesFormPost: true,
      });
      controller.redirectToProvider('apple', res as unknown as Response);
      expect(res.cookie).toHaveBeenCalledWith(
        'oauth_state',
        's',
        expect.objectContaining({ sameSite: 'none', secure: true }),
      );
    });

    it('그 밖의 provider 는 지금처럼 SameSite=Lax', () => {
      service.getAuthorizationUrl.mockReturnValue({
        url: 'https://idp',
        state: 's',
        usesFormPost: false,
      });
      controller.redirectToProvider('google', res as unknown as Response);
      expect(res.cookie).toHaveBeenCalledWith(
        'oauth_state',
        's',
        expect.objectContaining({ sameSite: 'lax' }),
      );
    });
  });

  describe('handleFormPostCallback', () => {
    it('form_post 가 아닌 provider 의 POST 콜백은 처리하지 않는다', async () => {
      service.acceptsFormPost.mockReturnValue(false);
      await controller.handleFormPostCallback(
        'google',
        { code: 'c', state: 's' },
        reqWithState('s'),
        res as unknown as Response,
      );
      expect(service.resolveCallbackUser).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/fail');
    });

    it('state 가 맞으면 쿠키를 지우고 user 까지 넘긴다', async () => {
      service.acceptsFormPost.mockReturnValue(true);
      await controller.handleFormPostCallback(
        'apple',
        { code: 'c', state: 's', user: '{}' },
        reqWithState('s'),
        res as unknown as Response,
      );
      expect(res.clearCookie).toHaveBeenCalledWith('oauth_state');
      expect(service.resolveCallbackUser).toHaveBeenCalledWith(
        'apple',
        'c',
        's',
        's',
        { user: '{}' },
      );
    });

    it('state 가 다르면 쿠키를 지우지 않는다 (남의 사이트가 로그인을 끊지 못하게)', async () => {
      service.acceptsFormPost.mockReturnValue(true);
      await controller.handleFormPostCallback(
        'apple',
        { code: 'c', state: 'forged' },
        reqWithState('s'),
        res as unknown as Response,
      );
      expect(res.clearCookie).not.toHaveBeenCalled();
    });
  });

  describe('콜백 끝 — 비밀번호 로그인과 같은 완료 서비스를 탄다', () => {
    const callback = () =>
      controller.handleCallback(
        'google',
        'c',
        's',
        undefined,
        {
          cookies: { oauth_state: 's' },
          headers: { 'user-agent': 'ua' },
          ip: '1.2.3.4',
        } as unknown as Request,
        res as unknown as Response,
      );

    it('2FA 가 없으면 IP·UA 를 넘겨 세션을 받고 성공 URL 로 보낸다', async () => {
      await callback();
      expect(completion.complete).toHaveBeenCalledWith(
        'user-1',
        {
          provider: 'google',
          rememberMe: false,
          ipAddress: '1.2.3.4',
          userAgent: 'ua',
          proof: { kind: 'oauth', provider: 'google', providerId: 'g-1' },
        },
        res,
      );
      expect(res.redirect).toHaveBeenCalledWith('/ok');
    });

    it('2FA 가 필요하면 2FA 화면으로, 통과 뒤 갈 성공 주소를 redirect 에 실어 보낸다', async () => {
      completion.complete.mockResolvedValue({
        twoFactorRequired: true,
        availableMethods: { totp: true, email: false },
      });
      await callback();
      expect(res.redirect).toHaveBeenCalledWith(
        '/login?step=2fa&redirect=%2Fok',
      );
    });

    it('성공 주소가 다른 출처면 redirect 를 싣지 않는다 — 화면은 같은 출처의 경로만 받는다', async () => {
      const env: Record<string, string> = {
        OAUTH_FAILURE_REDIRECT_URL: '/fail',
        OAUTH_SUCCESS_REDIRECT_URL: 'https://app.example.com/home',
        OAUTH_TWO_FACTOR_REDIRECT_URL: 'https://web.example.com/login?step=2fa',
      };
      controller = new OAuthController(
        service as unknown as OAuthService,
        { get: (k: string) => env[k] } as unknown as ConfigService,
        completion as unknown as SignInCompletionService,
      );
      completion.complete.mockResolvedValue({
        twoFactorRequired: true,
        availableMethods: { totp: true, email: false },
      });
      await callback();
      expect(res.redirect).toHaveBeenCalledWith(
        'https://web.example.com/login?step=2fa',
      );
    });

    it('정지된 계정은 안내를 붙여 실패로 보낸다', async () => {
      completion.complete.mockRejectedValue(
        new AccountSuspendedException(new Date('2099-01-01')),
      );
      await callback();
      expect(res.redirect).toHaveBeenCalledWith(
        '/fail?error=account_suspended',
      );
    });

    it('같은 이메일의 기존 계정이 있으면 연동 안내를 붙인다', async () => {
      service.resolveCallbackUser.mockRejectedValue(new ConflictException());
      await callback();
      expect(res.redirect).toHaveBeenCalledWith(
        '/fail?error=oauth_email_conflict&provider=google',
      );
      expect(completion.complete).not.toHaveBeenCalled();
    });

    it('실패 URL 에 이미 error 가 있으면 덧붙이지 않고 바꾼다 — 화면은 첫 error 만 읽는다', async () => {
      const env: Record<string, string> = {
        OAUTH_FAILURE_REDIRECT_URL:
          'http://localhost:3000/login?error=oauth_failed',
      };
      controller = new OAuthController(
        service as unknown as OAuthService,
        { get: (k: string) => env[k] } as unknown as ConfigService,
        completion as unknown as SignInCompletionService,
      );
      completion.complete.mockRejectedValue(
        new AccountSuspendedException(new Date('2099-01-01')),
      );
      await callback();
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/login?error=account_suspended',
      );
    });

    it('그 밖의 실패는 실패 URL 로만 보낸다', async () => {
      service.resolveCallbackUser.mockRejectedValue(
        new UnauthorizedException('ACCOUNT_DELETED'),
      );
      await callback();
      expect(res.redirect).toHaveBeenCalledWith('/fail');
    });
  });
});
