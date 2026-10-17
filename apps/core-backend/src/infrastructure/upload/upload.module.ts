import { Module } from '@nestjs/common';
import { UploadModule as UploadLibModule } from '@weaver2/upload';
import { FilesController } from './controllers/files.controller';
import { FilesAdminController } from './controllers/files-admin.controller';
import { FileAccessRuleRegistry } from './file-access/file-access-rule.registry';
import { FileAccessService } from './file-access/file-access.service';
import { ProfileImageAccessRule } from './file-access/profile-image.access-rule';

@Module({
  imports: [UploadLibModule],
  controllers: [FilesController, FilesAdminController],
  providers: [
    FileAccessRuleRegistry,
    FileAccessService,
    ProfileImageAccessRule,
  ],
  exports: [FileAccessRuleRegistry, FileAccessService],
})
export class UploadModule {}
