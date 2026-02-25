import { Module } from '@nestjs/common';
import { UploadModule as UploadLibModule } from '@weaver2/upload';
import { SystemSettingModule } from '../config/system-setting.module';
import { UploadController } from './controllers/upload.controller';
import { UploadAdminController } from './controllers/upload-admin.controller';

@Module({
  imports: [UploadLibModule, SystemSettingModule],
  controllers: [UploadController, UploadAdminController],
})
export class UploadModule {}
