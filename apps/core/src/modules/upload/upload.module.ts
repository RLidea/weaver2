import { Module } from '@nestjs/common';
import { UploadController } from './controllers/upload.controller';
import { UploadService } from './services/upload.service';
import { PrismaModule } from '@weaver2/prisma';

@Module({
  imports: [PrismaModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
