import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { STORAGE_PROVIDER } from './providers/storage-provider.interface';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { ThumbnailService } from './services/thumbnail.service';
import { UploadService } from './services/upload.service';
import { CreateFileCommand } from './repositories/create-file.command';
import { FindFileByIdQuery } from './repositories/find-file-by-id.query';
import { DeleteFileCommand } from './repositories/delete-file.command';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: STORAGE_PROVIDER, useClass: LocalStorageProvider },
    ThumbnailService,
    CreateFileCommand,
    FindFileByIdQuery,
    DeleteFileCommand,
    UploadService,
  ],
  exports: [UploadService],
})
export class UploadModule {}
