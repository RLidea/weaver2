import { Module } from '@nestjs/common';
import { FindUserService } from './services/find-user.service';
import { DeleteAccountService } from './services/delete-account.service';
import { PrismaModule } from '@weaver2/prisma';
import { UserProfileController } from './controllers/user-profile.controller';
import { UserQueryController } from './controllers/user-query.controller';
import { UserAdminController } from './controllers/user-admin.controller';
import { UpdateUserProfileService } from './services/update-user-profile.service';

@Module({
  imports: [PrismaModule],
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
  ],
  exports: [FindUserService, UpdateUserProfileService, ChangePasswordService],
})
export class UserModule {}
