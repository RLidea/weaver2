import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import {
  UPLOAD_FILE_TYPES,
  setUploadResponseHeaders,
  uploadFileType,
  uploadTypeByExtension,
} from './file-types';

describe('UPLOAD_FILE_TYPES 시그니처', () => {
  const html = Buffer.from('<!doctype html><script>alert(1)</script>');

  it.each([
    ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0])],
    [
      'image/png',
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ],
    ['image/gif', Buffer.from('GIF89a')],
    ['image/webp', Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8 ', 'latin1')],
    ['application/pdf', Buffer.from('%PDF-1.4')],
    ['application/zip', Buffer.from([0x50, 0x4b, 0x03, 0x04])],
  ])('%s 의 실제 바이트는 통과한다', (mime, bytes) => {
    expect(UPLOAD_FILE_TYPES[mime].matches(bytes)).toBe(true);
  });

  it.each(Object.keys(UPLOAD_FILE_TYPES))(
    'HTML 바이트는 %s 로 통과하지 못한다',
    (mime) => {
      expect(UPLOAD_FILE_TYPES[mime].matches(html)).toBe(false);
    },
  );

  it('빈 파일은 어느 형식으로도 통과하지 못한다', () => {
    for (const type of Object.values(UPLOAD_FILE_TYPES)) {
      expect(type.matches(Buffer.alloc(0))).toBe(false);
    }
  });

  it('SVG 는 표에 없다 (스크립트를 품을 수 있다)', () => {
    expect(UPLOAD_FILE_TYPES['image/svg+xml']).toBeUndefined();
  });
});

describe('uploadFileType · uploadTypeByExtension', () => {
  it('표에 있는 형식만 찾는다 — 프로토타입 이름은 형식이 아니다', () => {
    expect(uploadFileType('image/png')?.ext).toBe('.png');
    for (const name of [
      'constructor',
      '__proto__',
      'toString',
      'hasOwnProperty',
    ]) {
      expect(uploadFileType(name)).toBeUndefined();
    }
  });

  it('저장 확장자로 형식을 되짚는다 (대소문자 무시)', () => {
    expect(uploadTypeByExtension('.png')).toEqual({
      contentType: 'image/png',
      inline: true,
    });
    expect(uploadTypeByExtension('.PDF')).toEqual({
      contentType: 'application/pdf',
      inline: false,
    });
    expect(uploadTypeByExtension('.html')).toBeUndefined();
    expect(uploadTypeByExtension('')).toBeUndefined();
  });
});

describe('/uploads 정적 응답 헤더', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    // 형식 검사가 생기기 전에 이미 저장된 .html 이 있다고 치고 띄운다
    const root = mkdtempSync(join(tmpdir(), 'uploads-'));
    mkdirSync(join(root, '2026'), { recursive: true });
    writeFileSync(join(root, '2026', 'old.html'), '<script>alert(1)</script>');
    writeFileSync(join(root, '2026', 'pic.png'), Buffer.from([0x89, 0x50]));

    const moduleRef = await Test.createTestingModule({}).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({
      logger: false,
    });
    app.useStaticAssets(root, {
      prefix: '/uploads',
      setHeaders: setUploadResponseHeaders,
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('이미 저장된 HTML 도 스크립트로 돌지 못한다 — sandbox · nosniff · 내려받기', async () => {
    const res = await request(app.getHttpServer()).get(
      '/uploads/2026/old.html',
    );

    expect(res.status).toBe(200);
    expect(res.headers['content-security-policy']).toBe(
      "sandbox; default-src 'none'",
    );
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-disposition']).toBe('attachment');
  });

  it('이미지는 인라인으로 보이되 sandbox 는 그대로 건다', async () => {
    const res = await request(app.getHttpServer()).get('/uploads/2026/pic.png');

    expect(res.headers['content-disposition']).toBeUndefined();
    expect(res.headers['content-security-policy']).toContain('sandbox');
  });
});
