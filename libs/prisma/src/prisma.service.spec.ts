import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: new ConfigService({
            // 어댑터는 첫 쿼리 전까지 접속하지 않는다 — 생성만 확인한다.
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/unused',
          }),
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await service.$disconnect();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('DATABASE_URL 이 없으면 만들지 않는다', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          PrismaService,
          { provide: ConfigService, useValue: new ConfigService({}) },
        ],
      }).compile(),
    ).rejects.toThrow('DATABASE_URL');
  });
});
