// libs/prisma/src/prisma.service.ts
import {
  Injectable,
  OnModuleInit,
  Optional,
  Inject,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './client';
import { PrismaServiceOptions } from './interfaces';
import { PRISMA_SERVICE_OPTIONS } from '@weaver2/prisma/prisma.constants';

/** pg 풀 기본 크기. DATABASE_POOL_MAX 로 바꾼다 (node-pg 기본값과 같다). */
const DEFAULT_POOL_MAX = 10;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    configService: ConfigService,
    @Optional()
    @Inject(PRISMA_SERVICE_OPTIONS)
    private readonly prismaServiceOptions: PrismaServiceOptions = {},
  ) {
    super({
      ...prismaServiceOptions.prismaOptions,
      // Prisma 7 은 드라이버 어댑터가 필수다. 풀 설정은 URL 의 connection_limit·pool_timeout 이
      // 아니라 여기서 정한다 (어댑터는 그 URL 파라미터를 읽지 않는다).
      adapter: new PrismaPg({
        connectionString: configService.getOrThrow<string>('DATABASE_URL'),
        max:
          Number(configService.get<string>('DATABASE_POOL_MAX')) ||
          DEFAULT_POOL_MAX,
        // v6 의 connect_timeout(5s)·유휴 연결 수명(300s)에 맞춘다. node-pg 기본값은 0(무한)·10s.
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 300_000,
      }),
    });
  }

  async onModuleInit() {
    if (this.prismaServiceOptions.explicitConnect) {
      await this.$connect();
    }
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
