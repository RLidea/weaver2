import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3StorageProvider } from './s3-storage.provider';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed.example/x'),
}));

describe('S3StorageProvider', () => {
  let provider: S3StorageProvider;
  let send: jest.SpyInstance;
  const signed = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

  beforeEach(() => {
    signed.mockClear();
    // 네트워크로 나가지 않게 보낸 명령만 받아 둔다
    send = jest
      .spyOn(S3Client.prototype, 'send')
      .mockResolvedValue({} as never);
    const config = {
      get: () => undefined,
      getOrThrow: (key: string) => `test-${key}`,
    } as unknown as ConfigService;
    provider = new S3StorageProvider(config);
  });

  afterEach(() => send.mockRestore());

  function signedInput() {
    const command = signed.mock.calls[0][1] as GetObjectCommand;
    return command.input;
  }

  describe('getFileUrl — 저장된 메타데이터 대신 확장자로 응답 헤더를 정한다', () => {
    it('이미지는 그 형식으로 인라인', async () => {
      await provider.getFileUrl('uploads/2026/10/a.png', 60);

      expect(signedInput()).toMatchObject({
        Key: 'uploads/2026/10/a.png',
        ResponseContentType: 'image/png',
        ResponseContentDisposition: 'inline',
      });
    });

    it('이미지가 아닌 형식은 내려받기', async () => {
      await provider.getFileUrl('uploads/2026/10/a.pdf', 60);

      expect(signedInput()).toMatchObject({
        ResponseContentType: 'application/pdf',
        ResponseContentDisposition: 'attachment',
      });
    });

    it('형식 확인 전에 저장된 .html 은 octet-stream 내려받기 (저장된 text/html 무시)', async () => {
      await provider.getFileUrl('uploads/2025/01/old.html', 60);

      expect(signedInput()).toMatchObject({
        ResponseContentType: 'application/octet-stream',
        ResponseContentDisposition: 'attachment',
      });
    });
  });

  describe('saveBuffer — 썸네일', () => {
    it('파일명 확장자의 이미지 형식으로 저장한다', async () => {
      const { path } = await provider.saveBuffer(
        Buffer.from('thumb'),
        'thumb.webp',
        'uploads/2026/10',
      );

      const [[command]] = send.mock.calls as [[PutObjectCommand]];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input.ContentType).toBe('image/webp');
      expect(command.input.ContentDisposition).toBeUndefined();
      expect(path).toMatch(/^uploads\/2026\/10\/[0-9a-f-]+\.webp$/);
    });

    it('표에 없는 확장자는 octet-stream 내려받기로 저장한다', async () => {
      await provider.saveBuffer(Buffer.from('x'), 'x.html', 'uploads');

      const [[command]] = send.mock.calls as [[PutObjectCommand]];
      expect(command.input).toMatchObject({
        ContentType: 'application/octet-stream',
        ContentDisposition: 'attachment',
      });
    });
  });
});
