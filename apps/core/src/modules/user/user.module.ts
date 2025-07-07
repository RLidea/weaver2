import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { FindUserService } from './services/find-user.service';
import { DeleteAccountService } from './services/delete-account.service';
import { PrismaModule } from '@weaver2/prisma';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [FindUserService, DeleteAccountService],
  exports: [FindUserService],
})
export class UserModule {}
