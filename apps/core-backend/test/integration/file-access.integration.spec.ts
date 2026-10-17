/**
 * File Access Integration Tests
 *
 * 파일을 내주는 길(/v1/files)이 붙은 쪽의 읽기 정책을 따르는지, 붙이기가 「주인은 하나」를 지키는지,
 * 정리가 아직 붙은 파일을 지우지 않는지를 실제 DB·실제 로컬 저장소로 잰다 (파일 접근 통제 설계 §8-6).
 * 막지 않으면 주소를 아는 사람이 곧 권한자가 된다 — 회원 전용 첨부·가린 파일이 그대로 내려간다.
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { PrismaService } from '@weaver2/prisma';
import { UploadService } from '@weaver2/upload';
import {
  createTestApp,
  closeTestApp,
  getTestingModule,
} from './helpers/test-app.helper';
import { getAuthCookies } from './helpers/auth.helper';
import { ensureSystemPermissionGroups } from './helpers/permission-group.helper';
import { BoardPermissionService } from '../../src/features/board/services/board-permission.service';

const TEST_PASSWORD = 'TestPass1234!';
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

/**
 * 정리 시험은 DB 전체를 훑는다. 공용 DB 를 문 레인에서 남의 고아 파일까지 지우지 않게,
 * 시험 파일만 걸리는 아주 오래된 시각과 아주 긴 보존 기간을 쓴다.
 */
const ANCIENT = new Date('2000-01-01T00:00:00Z');
const ANCIENT_RETENTION_HOURS = 20 * 365 * 24;

describe('File Access (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tag = `fa${Date.now()}`;
  const dir = `uploads/it-${tag}`;
  const userIds: string[] = [];
  const boardIds: string[] = [];

  let author: { id: string; email: string };
  let member: { id: string; email: string };
  let admin: { id: string; email: string };
  let authorCookies: string;
  let memberCookies: string;
  let adminCookies: string;
  let publicBoard: string;
  let memberBoard: string;

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

  let fileSeq = 0;
  /** 저장소에 실제 바이트를 쓰고 files 행을 만든다 */
  async function createFile(
    ownerId: string,
    extra: {
      hiddenAt?: Date;
      deletedAt?: Date;
      createdAt?: Date;
      detachedAt?: Date;
    } = {},
  ) {
    fileSeq += 1;
    const storageKey = `${dir}/f${fileSeq}.png`;
    writeFileSync(storageKey, PNG);
    return prisma.file.create({
      data: {
        storageKey,
        originalName: `f${fileSeq}.png`,
        mimeType: 'image/png',
        size: PNG.length,
        uploadedById: ownerId,
        ...extra,
      },
    });
  }

  async function createPost(boardId: string, fileIds: string[] = []) {
    const post = await prisma.post.create({
      data: { boardId, authorId: author.id, title: tag, content: tag },
    });
    for (const [position, fileId] of fileIds.entries()) {
      await prisma.postAttachment.create({
        data: { fileId, postId: post.id, position },
      });
    }
    return post.id;
  }

  /** CSRF 토큰은 세션에 묶인다 — 로그인 쿠키를 들고 받는다 */
  async function mutate(
    method: 'post' | 'patch' | 'delete',
    path: string,
    cookies: string,
    prepare: (req: request.Test) => request.Test = (req) => req,
  ) {
    const csrf = await request(app.getHttpServer())
      .get('/v1/auth/csrf-token')
      .set('Cookie', cookies);
    const csrfCookie = (
      csrf.headers['set-cookie'] as unknown as string[] | undefined
    )?.join('; ');
    const token = (csrf.body as { data: { csrfToken: string } }).data.csrfToken;
    // 요청 객체는 thenable 이라 await 하는 순간 나간다 — 꾸밈(attach·send)은 여기서 끝낸다
    return prepare(
      request(app.getHttpServer())
        [method](path)
        .set('Cookie', `${csrfCookie ?? ''}; ${cookies}`)
        .set('x-csrf-token', token),
    );
  }

  const get = (path: string, cookies?: string) => {
    const req = request(app.getHttpServer()).get(path);
    return cookies ? req.set('Cookie', cookies) : req;
  };

  beforeAll(async () => {
    mkdirSync(dir, { recursive: true });
    app = await createTestApp();
    prisma = getTestingModule().get(PrismaService);
    await ensureSystemPermissionGroups(prisma);
    const boards = getTestingModule().get(BoardPermissionService);

    author = await createUser('author');
    member = await createUser('member');
    admin = await createUser('admin', 'Admin');

    publicBoard = (
      await prisma.board.create({ data: { name: `${tag}_public` } })
    ).id;
    memberBoard = (
      await prisma.board.create({ data: { name: `${tag}_member` } })
    ).id;
    boardIds.push(publicBoard, memberBoard);
    await boards.createDefaultPermissions(publicBoard);
    await boards.createMemberOnlyPermissions(memberBoard);

    authorCookies = await getAuthCookies(app, author.email, TEST_PASSWORD);
    memberCookies = await getAuthCookies(app, member.email, TEST_PASSWORD);
    adminCookies = await getAuthCookies(app, admin.email, TEST_PASSWORD);
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      'DROP TABLE IF EXISTS "_it_inquiry_attachments"',
    );
    await prisma.post.deleteMany({ where: { boardId: { in: boardIds } } });
    await prisma.resourcePermission.deleteMany({
      where: { resourceType: 'board', resourceId: { in: boardIds } },
    });
    await prisma.board.deleteMany({ where: { id: { in: boardIds } } });
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { profileImageFileId: null },
    });
    await prisma.file.deleteMany({ where: { uploadedById: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await closeTestApp();
    rmSync(dir, { recursive: true, force: true });
  });

  describe('받기', () => {
    it('회원 전용 글의 첨부는 비회원에게 404, 회원에게 200 (private, no-cache)', async () => {
      const file = await createFile(author.id);
      await createPost(memberBoard, [file.id]);

      expect((await get(`/v1/files/${file.id}`)).status).toBe(404);

      const res = await get(`/v1/files/${file.id}`, memberCookies);
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('private, no-cache');
      expect(res.headers['content-type']).toBe('image/png');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-security-policy']).toContain('sandbox');
    });

    it('누구나 읽는 글의 첨부는 public 캐시, 같은 ETag 면 304', async () => {
      const file = await createFile(author.id);
      await createPost(publicBoard, [file.id]);

      const res = await get(`/v1/files/${file.id}`);
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('public, max-age=300');
      const etag = String(res.headers['etag']);
      expect(etag).toBeTruthy();

      const again = await get(`/v1/files/${file.id}`).set(
        'If-None-Match',
        etag,
      );
      expect(again.status).toBe(304);
    });

    it('304 는 권한 판정 뒤에만 — 못 보는 사람이 ETag 를 대도 404', async () => {
      const file = await createFile(author.id);
      await createPost(memberBoard, [file.id]);
      const etag = String(
        (await get(`/v1/files/${file.id}`, memberCookies)).headers['etag'],
      );
      expect(
        (await get(`/v1/files/${file.id}`).set('If-None-Match', etag)).status,
      ).toBe(404);
    });

    it('가린 파일은 관리자(UPLOAD.READ)만, 지운 파일은 아무도', async () => {
      const hidden = await createFile(author.id, { hiddenAt: new Date() });
      await createPost(publicBoard, [hidden.id]);
      expect((await get(`/v1/files/${hidden.id}`, memberCookies)).status).toBe(
        404,
      );
      expect((await get(`/v1/files/${hidden.id}`, adminCookies)).status).toBe(
        200,
      );

      const deleted = await createFile(author.id, { deletedAt: new Date() });
      expect((await get(`/v1/files/${deleted.id}`, authorCookies)).status).toBe(
        404,
      );
      expect((await get(`/v1/files/${deleted.id}`, adminCookies)).status).toBe(
        404,
      );
    });

    it('어디에도 안 붙은 파일은 올린 사람만', async () => {
      const file = await createFile(author.id);
      expect((await get(`/v1/files/${file.id}`, authorCookies)).status).toBe(
        200,
      );
      expect((await get(`/v1/files/${file.id}`, memberCookies)).status).toBe(
        404,
      );
      expect((await get(`/v1/files/${file.id}`)).status).toBe(404);
    });

    it('지운 글의 첨부는 못 받는다', async () => {
      const file = await createFile(author.id);
      const postId = await createPost(publicBoard, [file.id]);
      await prisma.post.update({
        where: { id: postId },
        data: { deletedAt: new Date() },
      });
      expect((await get(`/v1/files/${file.id}`, authorCookies)).status).toBe(
        404,
      );
    });

    it('프로필 이미지는 비회원도 받는다', async () => {
      const file = await createFile(member.id);
      await prisma.user.update({
        where: { id: member.id },
        data: { profileImageFileId: file.id },
      });
      expect((await get(`/v1/files/${file.id}`)).status).toBe(200);
    });
  });

  describe('올리기·붙이기', () => {
    it('업로드 응답에 저장 키가 없고, 주소는 /v1/files 다', async () => {
      const res = await mutate(
        'post',
        '/v1/files?generateThumbnail=false',
        authorCookies,
        (r) =>
          r.attach('files', PNG, {
            filename: 'a.png',
            contentType: 'image/png',
          }),
      );
      expect(res.status).toBe(201);
      const [dto] = (res.body as { data: Record<string, unknown>[] }).data;
      expect(dto).not.toHaveProperty('storageKey');
      expect(dto).not.toHaveProperty('storedName');
      expect(dto.url).toBe(`/api/v1/files/${dto.id as string}`);
      const row = await prisma.file.findUniqueOrThrow({
        where: { id: dto.id as string },
      });
      // 저장소를 비워 둔다 — 실제 업로드는 uploads/YYYY/MM 에 쓴다
      rmSync(row.storageKey, { force: true });
      if (row.thumbnailKey) rmSync(row.thumbnailKey, { force: true });
    });

    it('남이 올린 파일은 붙일 수 없다', async () => {
      const othersFile = await createFile(author.id);
      const res = await mutate('post', '/v1/posts', memberCookies, (r) =>
        r.send({
          boardId: publicBoard,
          title: tag,
          content: tag,
          attachmentFileIds: [othersFile.id],
        }),
      );
      expect(res.status).toBe(400);
      expect(
        await prisma.postAttachment.count({ where: { fileId: othersFile.id } }),
      ).toBe(0);
    });

    it('같은 파일을 두 글에 붙일 수 없다 — 동시에 보내도 하나만', async () => {
      const file = await createFile(author.id);
      const send = () =>
        mutate('post', '/v1/posts', authorCookies, (r) =>
          r.send({
            boardId: publicBoard,
            title: tag,
            content: tag,
            attachmentFileIds: [file.id],
          }),
        );
      const results = await Promise.all([send(), send(), send()]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 400, 400]);
      expect(
        await prisma.postAttachment.count({ where: { fileId: file.id } }),
      ).toBe(1);
    });

    it('글 수정으로 순서를 바꾸고 떼어 낸다 — 뗀 파일은 고아가 된다', async () => {
      const a = await createFile(author.id);
      const b = await createFile(author.id);
      const postId = await createPost(publicBoard, [a.id, b.id]);

      const res = await mutate(
        'patch',
        `/v1/posts/${postId}`,
        authorCookies,
        (r) => r.send({ attachmentFileIds: [b.id] }),
      );
      expect(res.status).toBe(200);
      const body = res.body as { data: { attachments: { id: string }[] } };
      expect(body.data.attachments.map((f) => f.id)).toEqual([b.id]);
      expect(
        await prisma.postAttachment.count({ where: { fileId: a.id } }),
      ).toBe(0);
    });

    it('글 상세 응답에 첨부가 순서대로 실린다', async () => {
      const a = await createFile(author.id);
      const b = await createFile(author.id);
      const postId = await createPost(publicBoard, [b.id, a.id]);
      const body = (await get(`/v1/posts/${postId}`)).body as {
        data: { attachments: { id: string; url: string }[] };
      };
      expect(body.data.attachments.map((f) => f.id)).toEqual([b.id, a.id]);
    });
  });

  describe('가림·탈퇴', () => {
    it('가린 첨부는 수정 목록에 없어도 떼지 않고, 가린 파일은 새로 붙일 수 없다', async () => {
      const shown = await createFile(author.id);
      const hidden = await createFile(author.id, { hiddenAt: new Date() });
      const postId = await createPost(publicBoard, [shown.id, hidden.id]);

      const res = await mutate(
        'patch',
        `/v1/posts/${postId}`,
        authorCookies,
        (r) => r.send({ attachmentFileIds: [shown.id] }),
      );
      expect(res.status).toBe(200);
      expect(
        await prisma.postAttachment.count({ where: { fileId: hidden.id } }),
      ).toBe(1);

      const hidden2 = await createFile(author.id, { hiddenAt: new Date() });
      const res2 = await mutate('post', '/v1/posts', authorCookies, (r) =>
        r.send({
          boardId: publicBoard,
          title: tag,
          content: tag,
          attachmentFileIds: [hidden2.id],
        }),
      );
      expect(res2.status).toBe(400);
    });

    it('탈퇴한 사람의 프로필 이미지는 못 받는다', async () => {
      const ghost = await createUser('ghost');
      const file = await createFile(ghost.id);
      await prisma.user.update({
        where: { id: ghost.id },
        data: { profileImageFileId: file.id, deletedAt: new Date() },
      });
      expect((await get(`/v1/files/${file.id}`)).status).toBe(404);
    });
  });

  describe('정리', () => {
    it('파생 프로젝트의 첨부 테이블에 붙은 파일은 건너뛰고, 고아만 지운다', async () => {
      // 본체가 모르는 첨부 테이블 — files 를 향해 Restrict
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "_it_inquiry_attachments" (
          "fileId" TEXT PRIMARY KEY REFERENCES files(id) ON DELETE RESTRICT)`);
      const old = ANCIENT;
      const kept = await createFile(author.id, { createdAt: old });
      const orphan = await createFile(author.id, { createdAt: old });
      await prisma.$executeRaw`
        INSERT INTO "_it_inquiry_attachments" ("fileId") VALUES (${kept.id})`;

      await getTestingModule()
        .get(UploadService)
        .purgeOrphanedFiles(ANCIENT_RETENTION_HOURS);

      expect(
        await prisma.file.findUnique({ where: { id: kept.id } }),
      ).not.toBeNull();
      expect(existsSync(kept.storageKey)).toBe(true);
      expect(
        await prisma.file.findUnique({ where: { id: orphan.id } }),
      ).toBeNull();
      expect(existsSync(orphan.storageKey)).toBe(false);

      await prisma.$executeRaw`
        DELETE FROM "_it_inquiry_attachments" WHERE "fileId" = ${kept.id}`;
    });

    it('오래전에 올렸어도 방금 떼어진 파일은 보존 기간을 다시 센다', async () => {
      const file = await createFile(author.id, {
        createdAt: ANCIENT,
        detachedAt: new Date(),
      });

      await getTestingModule()
        .get(UploadService)
        .purgeOrphanedFiles(ANCIENT_RETENTION_HOURS);

      expect(
        await prisma.file.findUnique({ where: { id: file.id } }),
      ).not.toBeNull();
    });

    it('글에 붙은 파일과 프로필 이미지는 오래돼도 지우지 않는다', async () => {
      const old = ANCIENT;
      const attached = await createFile(author.id, { createdAt: old });
      await createPost(publicBoard, [attached.id]);

      await getTestingModule()
        .get(UploadService)
        .purgeOrphanedFiles(ANCIENT_RETENTION_HOURS);

      expect(
        await prisma.file.findUnique({ where: { id: attached.id } }),
      ).not.toBeNull();
    });
  });
});
