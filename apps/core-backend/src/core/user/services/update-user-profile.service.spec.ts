import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { StorageProvider } from '@weaver2/upload';
import { UpdateUserProfileService } from './update-user-profile.service';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

function file(originalname: string, mimetype: string, buffer: Buffer) {
  return { originalname, mimetype, buffer } as Express.Multer.File;
}

describe('UpdateUserProfileService.uploadProfileImage', () => {
  let save: jest.Mock;
  let service: UpdateUserProfileService;

  beforeEach(() => {
    save = jest.fn().mockResolvedValue({
      storedName: 'a.png',
      path: 'uploads/a.png',
    });
    const storage = {
      save,
      getFileUrl: (p: string) => Promise.resolve(`/${p}`),
      delete: jest.fn(),
    } as unknown as StorageProvider;
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    } as unknown as PrismaService;
    service = new UpdateUserProfileService(prisma, storage);
  });

  it('이미지라고 선언한 HTML 은 거절한다', async () => {
    await expect(
      service.uploadProfileImage(
        'u1',
        file('x.html', 'image/png', Buffer.from('<script>alert(1)</script>')),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(save).not.toHaveBeenCalled();
  });

  it('진짜 이미지는 형식의 확장자로 저장한다 (사용자 파일명의 .html 무시)', async () => {
    await service.uploadProfileImage('u1', file('x.html', 'image/png', PNG));

    expect(save).toHaveBeenCalledWith(expect.anything(), expect.any(String), {
      ext: '.png',
      contentType: 'image/png',
      inline: true,
    });
  });
});
