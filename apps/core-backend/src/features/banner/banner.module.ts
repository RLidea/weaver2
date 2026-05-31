import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { BannerController } from './controllers/banner.controller';
import { BannerAdminController } from './controllers/banner-admin.controller';
import { BannerService } from './services/banner.service';

@Module({
  imports: [PrismaModule],
  controllers: [BannerController, BannerAdminController],
  providers: [BannerService],
  exports: [BannerService],
})
export class BannerModule {}
