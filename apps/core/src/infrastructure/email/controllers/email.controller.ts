import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { RequirePermission } from '../../../features/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';
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
  @RequirePermission(PERMISSIONS.EMAIL.SEND)
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
  @RequirePermission(PERMISSIONS.EMAIL.SEND)
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
  @RequirePermission(PERMISSIONS.EMAIL.SEND)
  async retryFailedEmail(@Param('emailLogId') emailLogId: string) {
    return this.emailBusinessService.retryFailedEmail(emailLogId);
  }

  /**
   * 이메일 로그 조회
   */
  @Get('logs')
  @RequirePermission(PERMISSIONS.EMAIL.LOG_READ)
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
  @RequirePermission(PERMISSIONS.EMAIL.LOG_READ)
  async getFailedEmailLogs(@Query() query: FindEmailLogsOptions) {
    return this.emailLogService.findFailedEmailLogs(query);
  }

  /**
   * 템플릿 목록 조회
   */
  @Get('templates')
  @RequirePermission(PERMISSIONS.EMAIL.TEMPLATE_MANAGE)
  async getEmailTemplates(@Query('activeOnly') activeOnly?: boolean) {
    return this.emailTemplateService.findAllTemplates(activeOnly !== false);
  }

  /**
   * 템플릿 상세 조회
   */
  @Get('templates/:id')
  @RequirePermission(PERMISSIONS.EMAIL.TEMPLATE_MANAGE)
  async getEmailTemplate(@Param('id') id: string) {
    return this.emailTemplateService.findTemplateById(id);
  }

  /**
   * 템플릿 생성
   */
  @Post('templates')
  @RequirePermission(PERMISSIONS.EMAIL.TEMPLATE_MANAGE)
  async createEmailTemplate(@Body() dto: CreateEmailTemplateDto) {
    return this.emailTemplateService.createTemplate(dto);
  }

  /**
   * 템플릿 수정
   */
  @Post('templates/:id')
  @RequirePermission(PERMISSIONS.EMAIL.TEMPLATE_MANAGE)
  async updateEmailTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.emailTemplateService.updateTemplate(id, dto);
  }
}
