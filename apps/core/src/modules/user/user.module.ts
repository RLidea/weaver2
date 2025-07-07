import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DeleteAccountService } from './services/delete-account.service';
import { PrismaModule } from '@weaver2/prisma';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService, DeleteAccountService],
  exports: [UserService],
})
export class UserModule {}
