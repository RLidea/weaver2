import { Module } from '@nestjs/common';
import { TermsController } from './controllers/terms.controller';
import { TermsService } from './services/terms.service';
import { PrismaModule } from '@weaver2/prisma';

@Module({
  imports: [PrismaModule],
  controllers: [TermsController],
  providers: [TermsService],
  exports: [TermsService],
})
export class TermsModule {}
