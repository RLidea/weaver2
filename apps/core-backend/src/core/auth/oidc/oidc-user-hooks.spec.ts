import { runOidcHook } from './oidc-user-hooks';

describe('runOidcHook', () => {
  const logger = { warn: jest.fn() };
  beforeEach(() => logger.warn.mockReset());

  it('값을 돌려준다', async () => {
    await expect(runOidcHook(logger, 'x', () => 42)).resolves.toBe(42);
    await expect(
      runOidcHook(logger, 'x', () => Promise.resolve('a')),
    ).resolves.toBe('a');
  });

  it('훅이 없으면 undefined', async () => {
    await expect(runOidcHook(logger, 'x', undefined)).resolves.toBeUndefined();
  });

  it('던지면 경고만 남기고 undefined', async () => {
    await expect(
      runOidcHook(logger, 'onConflict', () => {
        throw new Error('boom');
      }),
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      'OIDC_USER_HOOKS.onConflict failed: boom',
    );
  });

  it('걸린 훅은 한도에서 끊는다 — 부른 쪽이 붙잡히지 않는다', async () => {
    const started = Date.now();
    await expect(
      runOidcHook(
        logger,
        'afterSignIn',
        () => new Promise(() => undefined),
        30,
      ),
    ).resolves.toBeUndefined();
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(logger.warn).toHaveBeenCalledWith(
      'OIDC_USER_HOOKS.afterSignIn failed: timed out after 30ms',
    );
  });
});
