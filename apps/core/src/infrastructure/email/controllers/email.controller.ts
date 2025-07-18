import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../features/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../features/auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';
import { Role } from '@prisma/client';
import { EmailBusinessService } from '../services/email-business.service';
import { EmailLogService } from '../services/email-log.service';
import { EmailTemplateService } from '../services/email-template.service';
import {
  SendBusinessEmailDto,
  SendTemplateEmailDto,
} from '../dto/send-business-email.dto';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
} from '../dto/email-template.dto';
import { FindEmailLogsOptions } from '../repositories/find-email-logs.query';

@Controller({ path: 'email', version: '1' })
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(
    private readonly emailBusinessService: EmailBusinessService,
    private readonly emailLogService: EmailLogService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  /**
   * 일반 이메일 발송
   */
  @Post('send')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async sendEmail(
    @Body() dto: SendBusinessEmailDto,
    @AuthUser() user: CommonAuthUserDto,
  ) {
    return this.emailBusinessService.sendEmail({
      ...dto,
      userId: user.id,
    });
  }

  /**
   * 템플릿 기반 이메일 발송
   */
  @Post('send-template')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async sendTemplateEmail(
    @Body() dto: SendTemplateEmailDto,
    @AuthUser() user: CommonAuthUserDto,
  ) {
    return this.emailBusinessService.sendTemplateEmail({
      ...dto,
      userId: user.id,
    });
  }

  /**
   * 실패한 이메일 재발송
   */
  @Post('retry/:emailLogId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async retryFailedEmail(@Param('emailLogId') emailLogId: string) {
    return this.emailBusinessService.retryFailedEmail(emailLogId);
  }

  /**
   * 이메일 로그 조회
   */
  @Get('logs')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getEmailLogs(@Query() query: FindEmailLogsOptions) {
    return this.emailLogService.findLogs(query);
  }

  /**
   * 내 이메일 로그 조회
   */
  @Get('logs/my')
  async getMyEmailLogs(
    @Query() query: FindEmailLogsOptions,
    @AuthUser() user: CommonAuthUserDto,
  ) {
    return this.emailLogService.findUserEmailLogs(user.id, query);
  }

  /**
   * 실패한 이메일 로그 조회
   */
  @Get('logs/failed')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getFailedEmailLogs(@Query() query: FindEmailLogsOptions) {
    return this.emailLogService.findFailedEmailLogs(query);
  }

  /**
   * 템플릿 목록 조회
   */
  @Get('templates')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getEmailTemplates(@Query('activeOnly') activeOnly?: boolean) {
    return this.emailTemplateService.findAllTemplates(activeOnly !== false);
  }

  /**
   * 템플릿 상세 조회
   */
  @Get('templates/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getEmailTemplate(@Param('id') id: string) {
    return this.emailTemplateService.findTemplateById(id);
  }

  /**
   * 템플릿 생성
   */
  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async createEmailTemplate(@Body() dto: CreateEmailTemplateDto) {
    return this.emailTemplateService.createTemplate(dto);
  }

  /**
   * 템플릿 수정
   */
  @Post('templates/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async updateEmailTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.emailTemplateService.updateTemplate(id, dto);
  }
}
