import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { UploadService } from './upload.service';
import { ThumbnailService } from './thumbnail.service';
import { StorageProvider } from '../providers/storage-provider.interface';
import { CreateFileCommand } from '../repositories/create-file.command';
import { FindFileByIdQuery } from '../repositories/find-file-by-id.query';
import { DeleteFileCommand } from '../repositories/delete-file.command';
import { UpdateFileCommand } from '../repositories/update-file.command';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const PDF = Buffer.from('%PDF-1.7\n');
const HTML = Buffer.from(
  '<html><script>alert(document.cookie)</script></html>',
);

function multerFile(
  originalname: string,
  mimetype: string,
  buffer: Buffer,
): Express.Multer.File {
  return {
    originalname,
    mimetype,
    buffer,
    size: buffer.length,
  } as Express.Multer.File;
}

describe('UploadService.uploadFiles — 형식 확인', () => {
  let save: jest.Mock;
  let service: UploadService;

  const options = {
    maxFileSize: 1024 * 1024,
    allowedMimeTypes: [
      'image/png',
      'application/pdf',
      // 관리자가 설정에 넣었어도 시그니처 표에 없으면 받지 않는다
      'image/svg+xml',
    ],
    generateThumbnail: false,
    thumbnailWidth: 100,
    thumbnailHeight: 100,
  };

  beforeEach(() => {
    save = jest.fn((_file, directory: string, type: { ext: string }) =>
      Promise.resolve({
        storedName: `stored${type.ext}`,
        path: `${directory}/stored${type.ext}`,
      }),
    );
    const storage = {
      save,
      getFileUrl: (p: string) => Promise.resolve(`/${p}`),
    } as unknown as StorageProvider;
    const createFileCmd = {
      execute: jest.fn((data: Record<string, unknown>) =>
        Promise.resolve({
          id: 'f1',
          thumbnailPath: null,
          postId: null,
          createdAt: new Date(),
          deletedAt: null,
          ...data,
        }),
      ),
    } as unknown as CreateFileCommand;

    service = new UploadService(
      {} as PrismaService,
      storage,
      {} as ThumbnailService,
      createFileCmd,
      {} as FindFileByIdQuery,
      {} as DeleteFileCommand,
      {} as UpdateFileCommand,
    );
  });

  it('HTML 을 PDF 라고 선언해 올리면 거절한다 (저장형 XSS)', async () => {
    await expect(
      service.uploadFiles(
        [multerFile('x.html', 'application/pdf', HTML)],
        'u1',
        options,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(save).not.toHaveBeenCalled();
  });

  it('저장 확장자는 사용자 파일명이 아니라 검증된 형식에서 정한다', async () => {
    const [dto] = await service.uploadFiles(
      [multerFile('x.html', 'image/png', PNG)],
      'u1',
      options,
    );

    expect(save).toHaveBeenCalledWith(expect.anything(), expect.any(String), {
      ext: '.png',
      contentType: 'image/png',
      inline: true,
    });
    expect(dto.storedName).toBe('stored.png');
  });

  it('PDF 는 내려받기로만 내도록 표시한다', async () => {
    await service.uploadFiles(
      [multerFile('doc.pdf', 'application/pdf', PDF)],
      'u1',
      options,
    );

    expect(save).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({ ext: '.pdf', inline: false }),
    );
  });

  it('설정에 있어도 내용을 확인할 수 없는 형식(SVG)은 받지 않는다', async () => {
    await expect(
      service.uploadFiles(
        [multerFile('x.svg', 'image/svg+xml', Buffer.from('<svg/>'))],
        'u1',
        options,
      ),
    ).rejects.toThrow(/내용을 확인할 수 없는 형식/);
    expect(save).not.toHaveBeenCalled();
  });
});
