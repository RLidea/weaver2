/**
 * Post Read Policy Integration Tests
 *
 * 「이 사람이 이 글을 읽을 수 있나」가 상세·전체 목록·작성자별 목록·댓글·검색에서 같은 답을
 * 내는지 HTTP 로 잰다 (파일 접근 통제 설계 §4.3). 막지 않으면 회원 전용 게시판 글이
 * boardId 없는 목록·작성자 목록·검색으로 새고, 로그인한 누구나 남의 비밀글을 읽는다.
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

interface ListBody {
  data: { data?: { id: string }[]; posts?: { id: string }[] } & {
    comments?: { id: string }[];
  };
}

describe('Post Read Policy (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tag = `prp${Date.now()}`;
  const userIds: string[] = [];
  const boardIds: string[] = [];

  let author: { id: string; email: string };
  let member: { id: string; email: string };
  let admin: { id: string; email: string };
  let memberCookies: string;
  let adminCookies: string;
  let authorCookies: string;

  let publicPost: string;
  let memberOnlyPost: string;
  let adminOnlyPost: string;
  let secretPost: string;
  let hiddenPost: string;
  let memberOnlyComment: string;

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

  async function createBoard(
    name: string,
    setup: (boardId: string) => Promise<void>,
  ) {
    const board = await prisma.board.create({
      data: { name: `${tag}_${name}` },
    });
    boardIds.push(board.id);
    await setup(board.id);
    return board.id;
  }

  async function createPost(
    boardId: string,
    title: string,
    extra: { isSecret?: boolean; hiddenAt?: Date } = {},
  ) {
    const post = await prisma.post.create({
      data: {
        boardId,
        authorId: author.id,
        title: `${tag} ${title}`,
        content: `${tag} ${title} 본문`,
        ...extra,
      },
    });
    return post.id;
  }

  const ids = (body: ListBody) =>
    (body.data.data ?? body.data.posts ?? []).map((p) => p.id);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = getTestingModule().get(PrismaService);
    await ensureSystemPermissionGroups(prisma);
    const boards = getTestingModule().get(BoardPermissionService);

    author = await createUser('author');
    member = await createUser('member');
    admin = await createUser('admin', 'Admin');

    const publicBoard = await createBoard('public', (id) =>
      boards.createDefaultPermissions(id),
    );
    const memberBoard = await createBoard('member', (id) =>
      boards.createMemberOnlyPermissions(id),
    );
    // Admin 그룹만 읽는 게시판 — 로그인한 일반 회원도 못 읽는다
    const adminBoard = await createBoard('admin', async (id) => {
      const group = await prisma.permissionGroup.findUniqueOrThrow({
        where: { name: 'Admin' },
      });
      await prisma.resourcePermission.create({
        data: {
          resourceType: 'board',
          resourceId: id,
          action: 'read',
          allowedGroups: { create: { permissionGroupId: group.id } },
        },
      });
    });

    publicPost = await createPost(publicBoard, '공개글');
    memberOnlyPost = await createPost(memberBoard, '회원글');
    adminOnlyPost = await createPost(adminBoard, '관리자글');
    secretPost = await createPost(publicBoard, '비밀글', { isSecret: true });
    hiddenPost = await createPost(publicBoard, '가린글', {
      hiddenAt: new Date(),
    });
    memberOnlyComment = (
      await prisma.comment.create({
        data: {
          postId: memberOnlyPost,
          authorId: author.id,
          content: `${tag} 회원글댓글`,
        },
      })
    ).id;

    memberCookies = await getAuthCookies(app, member.email, TEST_PASSWORD);
    adminCookies = await getAuthCookies(app, admin.email, TEST_PASSWORD);
    authorCookies = await getAuthCookies(app, author.email, TEST_PASSWORD);
  });

  afterAll(async () => {
    await prisma.comment.deleteMany({
      where: { post: { boardId: { in: boardIds } } },
    });
    await prisma.post.deleteMany({ where: { boardId: { in: boardIds } } });
    await prisma.resourcePermission.deleteMany({
      where: { resourceType: 'board', resourceId: { in: boardIds } },
    });
    await prisma.board.deleteMany({ where: { id: { in: boardIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await closeTestApp();
  });

  const get = (path: string, cookies?: string) => {
    const req = request(app.getHttpServer()).get(path);
    return cookies ? req.set('Cookie', cookies) : req;
  };

  describe('boardId 없는 전체 목록', () => {
    it('비회원에게 회원 전용·관리자 전용·비밀·가린 글을 주지 않는다', async () => {
      const res = await get('/v1/posts?limit=100');
      expect(res.status).toBe(200);
      const got = ids(res.body as ListBody);
      expect(got).toContain(publicPost);
      expect(got).not.toContain(memberOnlyPost);
      expect(got).not.toContain(adminOnlyPost);
      expect(got).not.toContain(secretPost);
      expect(got).not.toContain(hiddenPost);
    });

    it('회원은 회원 전용 글을 보지만 남의 비밀글·관리자 전용 글은 못 본다', async () => {
      const got = ids(
        (await get('/v1/posts?limit=100', memberCookies)).body as ListBody,
      );
      expect(got).toContain(memberOnlyPost);
      expect(got).not.toContain(adminOnlyPost);
      expect(got).not.toContain(secretPost);
    });

    it('작성자와 게시판 관리자는 비밀글을 본다', async () => {
      expect(
        ids((await get('/v1/posts?limit=100', authorCookies)).body as ListBody),
      ).toContain(secretPost);
      const adminGot = ids(
        (await get('/v1/posts?limit=100', adminCookies)).body as ListBody,
      );
      expect(adminGot).toContain(secretPost);
      expect(adminGot).toContain(adminOnlyPost);
    });
  });

  describe('상세', () => {
    it('게시판 READ 가 없으면 403', async () => {
      expect((await get(`/v1/posts/${memberOnlyPost}`)).status).toBe(403);
      expect(
        (await get(`/v1/posts/${adminOnlyPost}`, memberCookies)).status,
      ).toBe(403);
      expect(
        (await get(`/v1/posts/${memberOnlyPost}`, memberCookies)).status,
      ).toBe(200);
    });

    it('남의 비밀글은 로그인해도 404, 작성자·관리자는 200', async () => {
      expect((await get(`/v1/posts/${secretPost}`)).status).toBe(404);
      expect((await get(`/v1/posts/${secretPost}`, memberCookies)).status).toBe(
        404,
      );
      expect((await get(`/v1/posts/${secretPost}`, authorCookies)).status).toBe(
        200,
      );
      expect((await get(`/v1/posts/${secretPost}`, adminCookies)).status).toBe(
        200,
      );
    });

    it('가린 글은 관리자에게도 404', async () => {
      expect((await get(`/v1/posts/${hiddenPost}`, adminCookies)).status).toBe(
        404,
      );
    });

    it('남의 비밀글의 댓글도 못 본다', async () => {
      expect(
        (await get(`/v1/posts/${secretPost}/comments`, memberCookies)).status,
      ).toBe(404);
    });
  });

  describe('댓글 하나', () => {
    it('가린 댓글은 id 로 직접 받아도 404', async () => {
      const hidden = await prisma.comment.create({
        data: {
          postId: publicPost,
          authorId: author.id,
          content: `${tag} 가린 댓글`,
          hiddenAt: new Date(),
        },
      });
      expect(
        (await get(`/v1/comments/${hidden.id}`, memberCookies)).status,
      ).toBe(404);
    });

    it('남의 비밀글에 예전에 단 자기 댓글은 글을 못 읽어도 지울 수 있다', async () => {
      const mine = await prisma.comment.create({
        data: {
          postId: secretPost,
          authorId: member.id,
          content: `${tag} 비밀글에 단 댓글`,
        },
      });
      // CSRF 토큰은 세션에 묶인다 — 로그인 쿠키를 들고 받는다
      const csrf = await request(app.getHttpServer())
        .get('/v1/auth/csrf-token')
        .set('Cookie', memberCookies);
      const csrfCookie = (
        csrf.headers['set-cookie'] as unknown as string[] | undefined
      )?.join('; ');
      const token = (csrf.body as { data: { csrfToken: string } }).data
        .csrfToken;
      const res = await request(app.getHttpServer())
        .delete(`/v1/comments/${mine.id}`)
        .set('Cookie', `${csrfCookie ?? ''}; ${memberCookies}`)
        .set('x-csrf-token', token);
      expect(res.status).toBe(204);
    });
  });

  describe('작성자별 목록', () => {
    it('비회원이 보는 작성자 글 목록에 회원 전용·비밀글이 없다', async () => {
      const got = ids(
        (await get(`/v1/users/${author.id}/posts?limit=100`)).body as ListBody,
      );
      expect(got).toContain(publicPost);
      expect(got).not.toContain(memberOnlyPost);
      expect(got).not.toContain(secretPost);
    });

    it('비회원이 보는 작성자 댓글 목록에 회원 전용 글의 댓글이 없다', async () => {
      const anon = ids(
        (await get(`/v1/users/${author.id}/comments?limit=100`))
          .body as ListBody,
      );
      expect(anon).not.toContain(memberOnlyComment);
      const asMember = ids(
        (await get(`/v1/users/${author.id}/comments?limit=100`, memberCookies))
          .body as ListBody,
      );
      expect(asMember).toContain(memberOnlyComment);
    });
  });

  describe('검색', () => {
    const search = (q: string, cookies: string) =>
      get(`/v1/search?q=${encodeURIComponent(q)}&limit=50`, cookies);

    it('회원은 관리자 전용 게시판 글·댓글을 검색으로 찾지 못한다', async () => {
      const body = (await search(tag, memberCookies)).body as {
        data: { posts: { id: string }[] };
      };
      const got = body.data.posts.map((p) => p.id);
      expect(got).toContain(memberOnlyPost);
      expect(got).not.toContain(adminOnlyPost);
      expect(got).not.toContain(secretPost);
      expect(got).not.toContain(hiddenPost);

      const asAdmin = (await search(tag, adminCookies)).body as {
        data: { posts: { id: string }[] };
      };
      expect(asAdmin.data.posts.map((p) => p.id)).toContain(adminOnlyPost);
    });

    it('지운 댓글은 검색되지 않는다', async () => {
      const gone = await prisma.comment.create({
        data: {
          postId: publicPost,
          authorId: author.id,
          content: `${tag}지운댓글`,
          deletedAt: new Date(),
        },
      });
      const body = (await search(`${tag}지운댓글`, memberCookies)).body as {
        data: { comments: { id: string }[] };
      };
      expect(body.data.comments.map((c) => c.id)).not.toContain(gone.id);
    });
  });
});
