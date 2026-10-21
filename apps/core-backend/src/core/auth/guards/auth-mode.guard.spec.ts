import { Controller, NotFoundException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthModeGuard } from './auth-mode.guard';
import { LocalAuthOnly } from '../decorators/local-auth-only.decorator';
import { SsoOnly } from '../decorators/sso-only.decorator';
import { AuthModeConfig } from '../auth-mode';

@Controller()
class Handlers {
  @LocalAuthOnly()
  local() {}

  @SsoOnly()
  sso() {}

  plain() {}
}

@LocalAuthOnly()
@Controller()
class LocalClass {
  inherited() {}
}

function contextFor(
  cls: { prototype: object },
  name: string,
): ExecutionContext {
  const handler = Object.getOwnPropertyDescriptor(cls.prototype, name)
    ?.value as unknown;
  return {
    getHandler: () => handler,
    getClass: () => cls,
  } as unknown as ExecutionContext;
}

const LOCAL: AuthModeConfig = { mode: 'local' };
const SSO = { mode: 'sso', sso: {} } as AuthModeConfig;

function guard(config: AuthModeConfig) {
  return new AuthModeGuard(new Reflector(), config);
}

function statusAndMessage(fn: () => unknown) {
  try {
    fn();
  } catch (err) {
    return {
      notFound: err instanceof NotFoundException,
      message: (err as Error).message,
    };
  }
  return null;
}

describe('AuthModeGuard', () => {
  it('sso 에서 @LocalAuthOnly → 404 AUTH_MODE_SSO', () => {
    expect(
      statusAndMessage(() =>
        guard(SSO).canActivate(contextFor(Handlers, 'local')),
      ),
    ).toEqual({ notFound: true, message: 'AUTH_MODE_SSO' });
  });

  it('클래스에 붙은 @LocalAuthOnly 도 닫는다', () => {
    expect(
      statusAndMessage(() =>
        guard(SSO).canActivate(contextFor(LocalClass, 'inherited')),
      ),
    ).toEqual({ notFound: true, message: 'AUTH_MODE_SSO' });
  });

  it('local 에서 @SsoOnly → 404 AUTH_MODE_LOCAL', () => {
    expect(
      statusAndMessage(() =>
        guard(LOCAL).canActivate(contextFor(Handlers, 'sso')),
      ),
    ).toEqual({ notFound: true, message: 'AUTH_MODE_LOCAL' });
  });

  it('맞는 방식이면 통과', () => {
    expect(guard(LOCAL).canActivate(contextFor(Handlers, 'local'))).toBe(true);
    expect(guard(SSO).canActivate(contextFor(Handlers, 'sso'))).toBe(true);
  });

  it('표시가 없으면 어느 방식이든 통과', () => {
    expect(guard(LOCAL).canActivate(contextFor(Handlers, 'plain'))).toBe(true);
    expect(guard(SSO).canActivate(contextFor(Handlers, 'plain'))).toBe(true);
  });
});
