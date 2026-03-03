import { Module } from '@nestjs/common';
import { EmailModule as LibEmailModule } from '@weaver2/email';
import { PrismaModule } from '@weaver2/prisma';

// Controllers
import { EmailController } from './controllers/email.controller';

// Services
import { EmailBusinessService } from './services/email-business.service';
import { EmailLogService } from './services/email-log.service';
import { EmailTemplateService } from './services/email-template.service';

// Repositories
import { CreateEmailLogCommand } from './repositories/create-email-log.command';
import { UpdateEmailLogStatusCommand } from './repositories/update-email-log-status.command';
import { FindEmailLogsQuery } from './repositories/find-email-logs.query';
import { CreateEmailTemplateCommand } from './repositories/create-email-template.command';
import { FindEmailTemplateQuery } from './repositories/find-email-template.query';
import { UpdateEmailTemplateCommand } from './repositories/update-email-template.command';

@Module({
  imports: [
    LibEmailModule, // libs/email 모듈
    PrismaModule, // DB 접근을 위한 Prisma 모듈
  ],
  controllers: [EmailController],
  providers: [
    // Services
    EmailBusinessService,
    EmailLogService,
    EmailTemplateService,

    // Repositories
    CreateEmailLogCommand,
    UpdateEmailLogStatusCommand,
    FindEmailLogsQuery,
    CreateEmailTemplateCommand,
    FindEmailTemplateQuery,
    UpdateEmailTemplateCommand,
  ],
  exports: [EmailBusinessService, EmailLogService, EmailTemplateService],
})
export class EmailModule {}
