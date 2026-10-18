/**
 * ApiClient 의 CSRF 캐시와 refresh 의 관계.
 *
 * 서버는 CSRF 토큰을 refresh_token 쿠키에 묶는다(security.middleware.ts 의 getSessionIdentifier).
 * 그래서 refresh_token 이 바뀌면 받아 둔 CSRF 토큰이 무효가 된다. 아래 가짜 서버는 그 규칙만 흉내 낸다.
 */

type ApiClientModule = typeof import('./api-client');

const BASE = 'http://api.test';

class FakeServer {
  private generation = 0;
  refreshToken: string | null = null;
  accessValid = false;
  refreshCalls = 0;

  /** 다른 탭이 refresh 해 쿠키가 바뀐 것처럼 */
  rotate() {
    this.generation += 1;
    this.refreshToken = `r${this.generation}`;
    this.accessValid = true;
  }

  private csrfFor() {
    return `csrf:${this.refreshToken ?? 'anonymous'}`;
  }

  handle = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    const path = url.slice(BASE.length);
    const method = init?.method ?? 'GET';
    const headers = (init?.headers ?? {}) as Record<string, string>;

    if (path === '/v1/auth/csrf-token') {
      return Promise.resolve(json(200, { message: 'ok', data: { csrfToken: this.csrfFor() } }));
    }

    if (method !== 'GET' && headers['x-csrf-token'] !== this.csrfFor()) {
      return Promise.resolve(json(403, { success: false, message: 'Invalid CSRF token' }));
    }

    if (path === '/v1/auth/sign-in') {
      this.rotate();
      return Promise.resolve(json(200, { message: 'ok', data: null }));
    }

    if (path === '/v1/auth/refresh') {
      this.refreshCalls += 1;
      if (!this.refreshToken) return Promise.resolve(json(401, unauthorized(path)));
      this.rotate();
      return Promise.resolve(json(200, { message: 'ok', data: null }));
    }

    if (path === '/v1/ping') {
      return Promise.resolve(json(200, { message: 'ok', data: null }));
    }

    if (path === '/v1/users/me') {
      if (!this.accessValid) return Promise.resolve(json(401, unauthorized(path)));
      return Promise.resolve(json(200, { message: 'ok', data: { id: 1 } }));
    }

    return Promise.resolve(json(404, unauthorized(path)));
  };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function unauthorized(path: string) {
  return {
    success: false,
    error: { code: 401, message: 'Unauthorized', path, timestamp: '' },
  };
}

function loadClient(): ApiClientModule['apiClient'] {
  let mod!: ApiClientModule;
  jest.isolateModules(() => {
    mod = jest.requireActual<ApiClientModule>('./api-client');
  });
  return mod.apiClient;
}

describe('ApiClient — CSRF 캐시와 refresh', () => {
  let server: FakeServer;
  let onAuthError: jest.Mock;
  let client: ApiClientModule['apiClient'];

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = BASE;
    server = new FakeServer();
    jest.spyOn(globalThis, 'fetch').mockImplementation(server.handle);
    onAuthError = jest.fn();
    client = loadClient();
    client.setOnAuthError(onAuthError);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('로그인 → refresh → refresh 가 연달아 성공한다', async () => {
    await client.post('/v1/auth/sign-in', { email: 'a', password: 'b' });

    server.accessValid = false;
    await expect(client.get('/v1/users/me')).resolves.toMatchObject({ data: { id: 1 } });

    server.accessValid = false;
    await expect(client.get('/v1/users/me')).resolves.toMatchObject({ data: { id: 1 } });

    expect(server.refreshCalls).toBe(2);
    expect(onAuthError).not.toHaveBeenCalled();
  });

  it('refresh 가 낡은 CSRF 로 403 이면 새로 받아 한 번 더 한다', async () => {
    await client.post('/v1/auth/sign-in', { email: 'a', password: 'b' });
    await client.post('/v1/ping');
    // 이 탭이 CSRF 를 받아 둔 뒤 다른 탭이 refresh 해 쿠키가 바뀌었다
    server.rotate();

    server.accessValid = false;
    await expect(client.get('/v1/users/me')).resolves.toMatchObject({ data: { id: 1 } });
    expect(onAuthError).not.toHaveBeenCalled();
  });

  it('refresh 가 정말 거절되면(401) onAuthError 를 부른다', async () => {
    await expect(client.get('/v1/users/me')).rejects.toMatchObject({ status: 401 });
    expect(onAuthError).toHaveBeenCalledTimes(1);
  });
});
