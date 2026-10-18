/**
 * Post Revisions Integration Tests
 *
 * 게시판의 keepRevisions 를 켜면 글을 만들고 고칠 때마다 판이 쌓이고, 관리자가
 * `GET /v1/admin/posts/:postId/revisions` 로 목록을, `…/:revisionId` 로 전문을 읽는지
 * HTTP 로 잰다. 파생 프로젝트가 판 비교 화면을 이 두 경로에 기대어 짓는다.
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@weaver2/prisma';
import {
  createTestApp,
  closeTestApp,
  getTestingModule,
} from './helpers/test-app.helper';
import { getAuthCookies } from './helpers/auth.helper';
import { ensureSystemPermissionGroups } from './helpers/permission-group.helper';
import { BoardPermissionService } from '../../src/features/board/services/board-permission.service';

const TEST_PASSWORD = 'TestPass1234!';

interface RevisionBody {
  id: string;
  postId: string;
  title: string;
  content?: string;
  actorUserId: string | null;
  actorKind: string;
}

describe('Post Revisions (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tag = `rev${Date.now()}`;
  const userIds: string[] = [];
  const boardIds: string[] = [];

  let author: { id: string };
  let authorCookies: string;
  let adminCookies: string;
  let memberCookies: string;
  let keptBoard: string;
  let plainBoard: string;

  async function createUser(name: string, groupName?: string) {
    const user = await prisma.user.create({
      data: {
        email: `${tag}_${name}@integration-test.local`,
        username: `${tag}_${name}`,
        displayName: `${tag}_${name}`,
        emailVerifiedAt: new Date(),
        localCredential: {
          create: { passwordHash: await bcrypt.hash(TEST_PASSWORD, 10) },
        },
      },
    });
    userIds.push(user.id);
    if (groupName) {
      const group = await prisma.permissionGroup.findUniqueOrThrow({
        where: { name: groupName },
      });
      await prisma.userPermissionGroup.create({
        data: { userId: user.id, permissionGroupId: group.id },
      });
    }
    return user;
  }

  /** CSRF 토큰은 세션에 묶인다 — 로그인 쿠키를 들고 받는다 */
  async function mutate(
    method: 'post' | 'patch',
    path: string,
    cookies: string,
    body: object,
  ) {
    const csrf = await request(app.getHttpServer())
      .get('/v1/auth/csrf-token')
      .set('Cookie', cookies);
    const csrfCookie = (
      csrf.headers['set-cookie'] as unknown as string[] | undefined
    )?.join('; ');
    const token = (csrf.body as { data: { csrfToken: string } }).data.csrfToken;
    return request(app.getHttpServer())
      [method](path)
      .set('Cookie', `${csrfCookie ?? ''}; ${cookies}`)
      .set('x-csrf-token', token)
      .send(body);
  }

  const get = (path: string, cookies: string) =>
    request(app.getHttpServer()).get(path).set('Cookie', cookies);

  async function createPost(boardId: string, title: string) {
    const res = await mutate('post', '/v1/posts', authorCookies, {
      boardId,
      title,
      content: `${title} 본문`,
    });
    expect(res.status).toBe(201);
    return (res.body as { data: { id: string } }).data.id;
  }

  const listRevisions = async (postId: string) => {
    const res = await get(`/v1/admin/posts/${postId}/revisions`, adminCookies);
    expect(res.status).toBe(200);
    return (res.body as { data: RevisionBody[] }).data;
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = getTestingModule().get(PrismaService);
    await ensureSystemPermissionGroups(prisma);
    const boards = getTestingModule().get(BoardPermissionService);

    author = await createUser('author');
    await createUser('member');
    await createUser('admin', 'Admin');
    authorCookies = await getAuthCookies(
      app,
      `${tag}_author@integration-test.local`,
      TEST_PASSWORD,
    );
    memberCookies = await getAuthCookies(
      app,
      `${tag}_member@integration-test.local`,
      TEST_PASSWORD,
    );
    adminCookies = await getAuthCookies(
      app,
      `${tag}_admin@integration-test.local`,
      TEST_PASSWORD,
    );

    for (const name of ['kept', 'plain']) {
      const board = await prisma.board.create({
        data: { name: `${tag}_${name}` },
      });
      boardIds.push(board.id);
      await boards.createDefaultPermissions(board.id);
    }
    [keptBoard, plainBoard] = boardIds;

    // 켜는 길은 관리자 게시판 수정 경로다
    const toggled = await mutate(
      'patch',
      `/v1/boards/${keptBoard}`,
      adminCookies,
      { keepRevisions: true },
    );
    expect(toggled.status).toBe(200);
    expect(
      (toggled.body as { data: { keepRevisions: boolean } }).data.keepRevisions,
    ).toBe(true);
  });

  afterAll(async () => {
    // 판은 글을 지우면 함께 지워진다 (onDelete: Cascade)
    await prisma.post.deleteMany({ where: { boardId: { in: boardIds } } });
    await prisma.resourcePermission.deleteMany({
      where: { resourceType: 'board', resourceId: { in: boardIds } },
    });
    await prisma.board.deleteMany({ where: { id: { in: boardIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await closeTestApp();
  });

  describe('켠 게시판', () => {
    let postId: string;

    beforeAll(async () => {
      postId = await createPost(keptBoard, `${tag} 첫 제목`);
      // 제목만, 그다음 본문만 고친다
      await mutate('patch', `/v1/posts/${postId}`, authorCookies, {
        title: `${tag} 둘째 제목`,
      });
      await mutate('patch', `/v1/posts/${postId}`, authorCookies, {
        content: '셋째 본문',
      });
    });

    it('만들 때 한 판, 고칠 때마다 한 판 — 최신 순, 목록에는 본문이 없다', async () => {
      const revisions = await listRevisions(postId);

      expect(revisions.map((r) => r.title)).toEqual([
        `${tag} 둘째 제목`,
        `${tag} 둘째 제목`,
        `${tag} 첫 제목`,
      ]);
      expect(revisions.every((r) => r.content === undefined)).toBe(true);
      expect(revisions[0]).toMatchObject({
        postId,
        actorUserId: author.id,
        actorKind: 'SESSION',
      });
    });

    it('제목 · 본문이 그대로인 저장(상태만 바꿈)은 판을 늘리지 않는다', async () => {
      const before = await listRevisions(postId);
      const res = await mutate('patch', `/v1/posts/${postId}`, authorCookies, {
        isPinned: true,
      });
      expect(res.status).toBe(200);

      expect(await listRevisions(postId)).toHaveLength(before.length);
    });

    it('판 전문은 그 판의 제목 · 본문을 준다', async () => {
      const [latest, , first] = await listRevisions(postId);

      const res = await get(
        `/v1/admin/posts/${postId}/revisions/${first.id}`,
        adminCookies,
      );
      expect(res.status).toBe(200);
      expect((res.body as { data: RevisionBody }).data).toMatchObject({
        id: first.id,
        title: `${tag} 첫 제목`,
        content: `${tag} 첫 제목 본문`,
      });

      const latestRes = await get(
        `/v1/admin/posts/${postId}/revisions/${latest.id}`,
        adminCookies,
      );
      expect((latestRes.body as { data: RevisionBody }).data.content).toBe(
        '셋째 본문',
      );
    });

    it('다른 글의 판 id 로 부르면 404', async () => {
      const otherPost = await createPost(keptBoard, `${tag} 다른 글`);
      const [otherRevision] = await listRevisions(otherPost);

      const res = await get(
        `/v1/admin/posts/${postId}/revisions/${otherRevision.id}`,
        adminCookies,
      );
      expect(res.status).toBe(404);
    });

    it('관리 권한이 없는 회원은 목록 · 전문 모두 403', async () => {
      const [revision] = await listRevisions(postId);

      const list = await get(
        `/v1/admin/posts/${postId}/revisions`,
        memberCookies,
      );
      const one = await get(
        `/v1/admin/posts/${postId}/revisions/${revision.id}`,
        memberCookies,
      );
      expect(list.status).toBe(403);
      expect(one.status).toBe(403);
    });
  });

  it('끈 게시판의 글은 만들고 고쳐도 판이 없다', async () => {
    const postId = await createPost(plainBoard, `${tag} 끈 글`);
    await mutate('patch', `/v1/posts/${postId}`, authorCookies, {
      title: `${tag} 끈 글 고침`,
    });

    expect(await listRevisions(postId)).toEqual([]);
  });

  it('없는 글의 판 목록은 404', async () => {
    const res = await get(
      '/v1/admin/posts/00000000-0000-4000-8000-000000000000/revisions',
      adminCookies,
    );
    expect(res.status).toBe(404);
  });
});
