import { Module } from '@nestjs/common';
import { FindUserService } from './services/find-user.service';
import { DeleteAccountService } from './services/delete-account.service';
import { PrismaModule } from '@weaver2/prisma';
import { UserProfileController } from './controllers/user-profile.controller';
import { UserQueryController } from './controllers/user-query.controller';
import { UserAdminController } from './controllers/user-admin.controller';
import { UpdateUserProfileService } from './services/update-user-profile.service';
import { ChangePasswordService } from './services/change-password.service';
import { UpdateProfileService } from './services/update-profile.service';
import { EmailChangeService } from './services/email-change.service';
import { EmailModule } from '../../infrastructure/email/email.module';
import { UploadModule } from '@weaver2/upload';

@Module({
  imports: [PrismaModule, EmailModule, UploadModule],
  controllers: [
    UserProfileController,
    UserQueryController,
    UserAdminController,
  ],
  providers: [
    FindUserService,
    DeleteAccountService,
    UpdateUserProfileService,
    ChangePasswordService,
    UpdateProfileService,
    EmailChangeService,
  ],
  exports: [
    FindUserService,
    UpdateUserProfileService,
    ChangePasswordService,
    UpdateProfileService,
  ],
})
export class UserModule {}
