// libs/prisma/src/prisma.service.ts
import {
  Injectable,
  OnModuleInit,
  Optional,
  Inject,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaServiceOptions } from './interfaces';
import { PRISMA_SERVICE_OPTIONS } from '@weaver2/prisma/prisma.constants';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @Optional()
    @Inject(PRISMA_SERVICE_OPTIONS)
    private readonly prismaServiceOptions: PrismaServiceOptions = {},
  ) {
    super(prismaServiceOptions.prismaOptions);
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
