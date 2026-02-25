import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@weaver2/prisma';
import { STORAGE_PROVIDER } from './providers/storage-provider.interface';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { ThumbnailService } from './services/thumbnail.service';
import { UploadService } from './services/upload.service';
import { CreateFileCommand } from './repositories/create-file.command';
import { FindFileByIdQuery } from './repositories/find-file-by-id.query';
import { DeleteFileCommand } from './repositories/delete-file.command';
import { UpdateFileCommand } from './repositories/update-file.command';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const driver = configService.get<string>('STORAGE_DRIVER', 'local');
        if (driver === 's3') return new S3StorageProvider(configService);
        return new LocalStorageProvider();
      },
      inject: [ConfigService],
    },
    ThumbnailService,
    CreateFileCommand,
    FindFileByIdQuery,
    DeleteFileCommand,
    UpdateFileCommand,
    UploadService,
  ],
  exports: [UploadService],
})
export class UploadModule {}
