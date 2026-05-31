import { Test } from '@nestjs/testing';
import { PrismaService } from '@weaver2/prisma';
import { BannerService } from './banner.service';

describe('BannerService', () => {
  let service: BannerService;
  let prisma: { banner: { findMany: jest.Mock; create: jest.Mock; update: jest.Mock; findFirst: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      banner: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [BannerService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(BannerService);
  });

  it('findActiveBySlot: 활성·기간 필터로 조회해 DTO 배열을 반환한다', async () => {
    const row = {
      id: 'b1', title: '여름 이벤트', imageFileId: 'f1', linkUrl: null,
      slot: 'MAIN_TOP', isActive: true, sortOrder: 0,
      startsAt: null, endsAt: null, createdById: 'u1',
      createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    };
    prisma.banner.findMany.mockResolvedValue([row]);

    const result = await service.findActiveBySlot('MAIN_TOP');

    expect(prisma.banner.findMany).toHaveBeenCalledTimes(1);
    const args = (prisma.banner.findMany.mock.calls as [{ where: Record<string, unknown> }][])[0][0];
    expect(args.where).toMatchObject({ deletedAt: null, isActive: true, slot: 'MAIN_TOP' });
    expect(args.where).toMatchObject({
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: expect.any(Date) } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: expect.any(Date) } }] },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b1');
    expect(result[0]).not.toHaveProperty('deletedAt'); // DTO 매핑 확인
  });
});
