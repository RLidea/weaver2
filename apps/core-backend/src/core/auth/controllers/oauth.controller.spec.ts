import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { OAuthController } from './oauth.controller';
import { OAuthService } from '../oauth/oauth.service';

describe('OAuthController', () => {
  let service: {
    getAuthorizationUrl: jest.Mock;
    acceptsFormPost: jest.Mock;
    handleOAuthCallback: jest.Mock;
  };
  let controller: OAuthController;
  let res: { redirect: jest.Mock; cookie: jest.Mock; clearCookie: jest.Mock };

  const reqWithState = (state?: string) =>
    ({ cookies: state ? { oauth_state: state } : {} }) as unknown as Request;

  beforeEach(() => {
    service = {
      getAuthorizationUrl: jest.fn(),
      acceptsFormPost: jest.fn(),
      handleOAuthCallback: jest.fn().mockResolvedValue(undefined),
    };
    const env: Record<string, string> = {
      OAUTH_FAILURE_REDIRECT_URL: '/fail',
    };
    controller = new OAuthController(
      service as unknown as OAuthService,
      { get: (k: string) => env[k] } as unknown as ConfigService,
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
      expect(service.handleOAuthCallback).not.toHaveBeenCalled();
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
      expect(service.handleOAuthCallback).toHaveBeenCalledWith(
        'apple',
        'c',
        's',
        's',
        res,
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
});
