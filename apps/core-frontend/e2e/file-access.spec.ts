import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { test, expect, type APIRequestContext } from '@playwright/test';
import { Client } from 'pg';

/**
 * 파일은 `/api/v1/files/:id` 로만 받는다 — Next 의 /api 리라이트를 지나 백엔드에 닿고, 백엔드가
 * 받을 때마다 붙은 쪽(게시글)의 읽기 정책을 묻는다 (파일 접근 통제 설계 §4.2).
 * 프록시를 지나서도 ① 권한별 응답 ② 캐시 헤더 ③ CSP sandbox · nosniff · attachment 가 남는지 본다.
 * ③ 이 떨어지면 형식 확인 전에 저장된 .html 이 같은 출처에서 스크립트로 돈다(저장형 XSS).
 *
 * 백엔드의 로컬 저장소 키는 cwd(저장소 루트) 기준이라(lane:e2e 는 `cd <워크트리> && pnpm prod:core`),
 * 세 단계 위의 uploads/ 에 시험 파일을 두고 files·posts 행을 SQL 로 만든 뒤 끝나면 지운다.
 * 격리 레인 DB 에서 돈다(`pnpm lane:e2e <레인> file-access`).
 */

const REPO_ROOT = join(__dirname, '..', '..', '..');
const dir = `uploads/e2e-${randomUUID()}`;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
// 이 스펙 전용 사용자 — 시드 계정은 다른 스펙(2FA)이 병렬로 상태를 바꾼다.
// 비밀번호 해시는 시드 계정(weaver@weaver.com, secret!!)에서 복사한다
const SEED_EMAIL = 'weaver@weaver.com';
const EMAIL = `e2e-files-${randomUUID()}@e2e.local`;
const PASSWORD = 'secret!!';

// 리다이렉트는 따라가지 않는다 — 로그인 화면으로 튕기면 200 이 아니라서 바로 드러난다
const NO_REDIRECT = { maxRedirects: 0 };

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(resolve(__dirname, '../../core-backend/.env'), 'utf8');
  const line = env.split('\n').find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('DATABASE_URL 을 찾지 못했습니다');
  return line.slice('DATABASE_URL='.length).replace(/^"|"$/g, '').trim();
}

const ids = {
  html: randomUUID(),
  png: randomUUID(),
  memberPng: randomUUID(),
  publicPost: randomUUID(),
  memberPost: randomUUID(),
  user: randomUUID(),
};

async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({ connectionString: databaseUrl() });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

/** 시드의 게시판 하나 — 비회원 READ 가 되는지(anonymous)로 고른다 */
async function boardWhereAnonymousRead(db: Client, anonymous: boolean) {
  const { rows } = await db.query<{ id: string }>(
    `SELECT b.id FROM boards b
       JOIN resource_permissions rp ON rp."resourceId" = b.id
      WHERE rp."resourceType" = 'board' AND rp.action = 'read'
        AND rp."allowAnonymous" = $1 AND b."deletedAt" IS NULL
      LIMIT 1`,
    [anonymous],
  );
  if (!rows[0]) throw new Error(`allowAnonymous=${anonymous} 인 게시판이 시드에 없습니다`);
  return rows[0].id;
}

/**
 * 로그인 한도는 IP 당 1분 10회다. CI 는 스로틀을 켠 채 돌고 앞선 스펙들이 매번 로그인하므로,
 * 429 면 Retry-After 만큼 기다렸다 한 번 더 한다.
 */
async function login(request: APIRequestContext) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const csrf = await request.get('/api/v1/auth/csrf-token');
    const token = ((await csrf.json()) as { data: { csrfToken: string } }).data.csrfToken;
    const res = await request.post('/api/v1/auth/sign-in', {
      headers: { 'x-csrf-token': token },
      data: { email: EMAIL, password: PASSWORD },
    });
    if (res.status() === 429 && attempt === 0) {
      const wait = Number(res.headers()['retry-after'] ?? '60');
      await new Promise((r) => setTimeout(r, (Math.min(wait, 65) + 1) * 1000));
      continue;
    }
    expect(res.ok(), await res.text()).toBe(true);
    return;
  }
}

test.describe('/api/v1/files — Next 리라이트를 지나서', () => {
  test.beforeAll(async () => {
    mkdirSync(join(REPO_ROOT, dir), { recursive: true });
    // 형식 확인이 생기기 전에 이미 저장된 HTML 이 있다고 친다
    writeFileSync(join(REPO_ROOT, dir, 'old.html'), '<script>alert(document.cookie)</script>');
    writeFileSync(join(REPO_ROOT, dir, 'pic.png'), PNG);
    writeFileSync(join(REPO_ROOT, dir, 'member.png'), PNG);

    await withDb(async (db) => {
      const authorId = ids.user;
      const name = EMAIL.split('@')[0];
      await db.query(
        `INSERT INTO users (id, email, username, "displayName", "emailVerifiedAt", "updatedAt")
         VALUES ($1, $2, $3, $3, now(), now())`,
        [authorId, EMAIL, name],
      );
      await db.query(
        `INSERT INTO local_credentials ("userId", "passwordHash", "passwordChangedAt", "updatedAt")
         SELECT $1, c."passwordHash", now(), now()
           FROM local_credentials c JOIN users u ON u.id = c."userId" WHERE u.email = $2`,
        [authorId, SEED_EMAIL],
      );
      const publicBoard = await boardWhereAnonymousRead(db, true);
      const memberBoard = await boardWhereAnonymousRead(db, false);

      const file = (id: string, key: string, mime: string) =>
        db.query(
          `INSERT INTO files (id, "storageKey", "originalName", "mimeType", size, "uploadedById")
           VALUES ($1, $2, $3, $4, 9, $5)`,
          [id, `${dir}/${key}`, key, mime, authorId],
        );
      await file(ids.html, 'old.html', 'text/html');
      await file(ids.png, 'pic.png', 'image/png');
      await file(ids.memberPng, 'member.png', 'image/png');

      const post = (id: string, boardId: string) =>
        db.query(
          `INSERT INTO posts (id, title, content, "boardId", "authorId", "updatedAt")
           VALUES ($1, 'e2e 첨부', 'e2e 첨부', $2, $3, now())`,
          [id, boardId, authorId],
        );
      await post(ids.publicPost, publicBoard);
      await post(ids.memberPost, memberBoard);

      const attach = (fileId: string, postId: string, position: number) =>
        db.query(
          `INSERT INTO post_attachments ("fileId", "postId", position) VALUES ($1, $2, $3)`,
          [fileId, postId, position],
        );
      await attach(ids.html, ids.publicPost, 0);
      await attach(ids.png, ids.publicPost, 1);
      await attach(ids.memberPng, ids.memberPost, 0);
    });
  });

  test.afterAll(async () => {
    await withDb(async (db) => {
      await db.query(`DELETE FROM posts WHERE id = ANY($1)`, [[ids.publicPost, ids.memberPost]]);
      await db.query(`DELETE FROM files WHERE id = ANY($1)`, [[ids.html, ids.png, ids.memberPng]]);
      await db.query(`DELETE FROM refresh_tokens WHERE "userId" = $1`, [ids.user]);
      await db.query(`DELETE FROM local_credentials WHERE "userId" = $1`, [ids.user]);
      await db.query(`DELETE FROM users WHERE id = $1`, [ids.user]);
    });
    rmSync(join(REPO_ROOT, dir), { recursive: true, force: true });
  });

  test('저장된 .html 은 sandbox · nosniff · 내려받기로, 누구나 읽는 글이면 5분 public 캐시', async ({ request }) => {
    const res = await request.get(`/api/v1/files/${ids.html}`, NO_REDIRECT);

    expect(res.status()).toBe(200);
    const headers = res.headers();
    expect(headers['content-security-policy']).toContain('sandbox');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['content-disposition']).toMatch(/^attachment/);
    expect(headers['cache-control']).toBe('public, max-age=300');
  });

  test('이미지는 인라인이지만 sandbox · nosniff 는 그대로', async ({ request }) => {
    const res = await request.get(`/api/v1/files/${ids.png}`, NO_REDIRECT);

    expect(res.status()).toBe(200);
    const headers = res.headers();
    expect(headers['content-type']).toContain('image/png');
    expect(headers['content-security-policy']).toContain('sandbox');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['content-disposition']).toBeUndefined();
  });

  test('회원 전용 글의 첨부는 비회원에게 404, 로그인하면 200 (캐시는 private)', async ({ request }) => {
    test.setTimeout(100_000); // 로그인 한도에 걸리면 최대 1분 기다린다
    expect((await request.get(`/api/v1/files/${ids.memberPng}`, NO_REDIRECT)).status()).toBe(404);

    await login(request);
    const res = await request.get(`/api/v1/files/${ids.memberPng}`, NO_REDIRECT);
    expect(res.status()).toBe(200);
    expect(res.headers()['cache-control']).toBe('private, no-cache');
  });

  test('옛 정적 주소 /uploads 로는 받을 수 없다', async ({ request }) => {
    const res = await request.get(`/${dir}/pic.png`, NO_REDIRECT);
    expect(res.status()).not.toBe(200);
  });
});
