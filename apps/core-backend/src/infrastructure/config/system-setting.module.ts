import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { SystemSettingService } from './system-setting.service';

@Module({
  imports: [PrismaModule],
  providers: [SystemSettingService],
  exports: [SystemSettingService],
})
export class SystemSettingModule {}
