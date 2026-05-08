import { Module } from '@nestjs/common';
import { UploadModule as UploadLibModule } from '@weaver2/upload';
import { UploadController } from './controllers/upload.controller';
import { UploadAdminController } from './controllers/upload-admin.controller';

@Module({
  imports: [UploadLibModule],
  controllers: [UploadController, UploadAdminController],
})
export class UploadModule {}
