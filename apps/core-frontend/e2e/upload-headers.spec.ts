import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { test, expect } from '@playwright/test';

/**
 * `/uploads` 는 Next 의 rewrite 로 백엔드 정적 서빙에 닿는다 — 우리 출처에서 열린다.
 * 백엔드가 응답마다 거는 CSP sandbox · nosniff · attachment 가 프록시를 지나서도 남는지 본다.
 * 하나라도 떨어지면 형식 확인 전에 저장된 .html 이 같은 출처에서 스크립트로 돈다(저장형 XSS).
 *
 * 백엔드는 `process.cwd()/uploads` 를 서빙하고, 그 cwd 는 저장소 루트다(lane:e2e 는
 * `cd <워크트리> && pnpm prod:core`, playwright.config 의 webServer 는 `cwd: '../..'`).
 * 그래서 이 파일에서 세 단계 위의 uploads/ 에 시험 파일을 직접 두고 끝나면 지운다.
 */

const UPLOADS_ROOT = join(__dirname, '..', '..', '..', 'uploads');
const dir = `e2e-${randomUUID()}`;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

// 공격이 닿는 사람은 로그인한 사용자다. 프록시(src/proxy.ts)는 이미지가 아닌 /uploads 를
// 비로그인이면 /login 으로 돌려보내므로, 쿠키 없이 재면 백엔드 응답이 아니라 로그인 화면을
// 잰다. 프록시는 쿠키가 있는지만 보니 값은 아무것이나 된다. 리다이렉트는 따라가지 않는다.
const AS_LOGGED_IN = { headers: { Cookie: 'refresh_token=e2e' }, maxRedirects: 0 };

test.describe('/uploads 응답 헤더 — Next rewrite 를 지나서', () => {
  test.beforeAll(() => {
    mkdirSync(join(UPLOADS_ROOT, dir), { recursive: true });
    // 형식 확인이 생기기 전에 이미 저장된 HTML 이 있다고 친다
    writeFileSync(join(UPLOADS_ROOT, dir, 'old.html'), '<script>alert(document.cookie)</script>');
    writeFileSync(join(UPLOADS_ROOT, dir, 'pic.png'), PNG);
  });

  test.afterAll(() => {
    rmSync(join(UPLOADS_ROOT, dir), { recursive: true, force: true });
  });

  test('저장된 .html 은 sandbox · nosniff · 내려받기로 나간다', async ({ request }) => {
    const res = await request.get(`/uploads/${dir}/old.html`, AS_LOGGED_IN);

    expect(res.status()).toBe(200);
    const headers = res.headers();
    expect(headers['content-security-policy']).toContain('sandbox');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['content-disposition']).toMatch(/^attachment/);
  });

  test('이미지는 인라인이지만 sandbox · nosniff 는 그대로', async ({ request }) => {
    const res = await request.get(`/uploads/${dir}/pic.png`, AS_LOGGED_IN);

    expect(res.status()).toBe(200);
    const headers = res.headers();
    expect(headers['content-type']).toContain('image/png');
    expect(headers['content-security-policy']).toContain('sandbox');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['content-disposition']).toBeUndefined();
  });
});
