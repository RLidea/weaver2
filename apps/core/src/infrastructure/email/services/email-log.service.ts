import { Injectable } from '@nestjs/common';
import { EmailStatus } from '@prisma/client';
import {
  CreateEmailLogCommand,
  CreateEmailLogData,
} from '../repositories/create-email-log.command';
import {
  FindEmailLogsQuery,
  FindEmailLogsOptions,
} from '../repositories/find-email-logs.query';
import { UpdateEmailLogStatusCommand } from '../repositories/update-email-log-status.command';

@Injectable()
export class EmailLogService {
  constructor(
    private readonly createEmailLogCommand: CreateEmailLogCommand,
    private readonly findEmailLogsQuery: FindEmailLogsQuery,
    private readonly updateEmailLogStatusCommand: UpdateEmailLogStatusCommand,
  ) {}

  async createLog(data: CreateEmailLogData) {
    return this.createEmailLogCommand.execute(data);
  }

  async findLogs(options: FindEmailLogsOptions = {}) {
    return this.findEmailLogsQuery.execute(options);
  }

  async updateLogStatus(
    id: string,
    status: EmailStatus,
    errorMessage?: string,
  ) {
    return this.updateEmailLogStatusCommand.execute(id, status, errorMessage);
  }

  async markAsSent(id: string) {
    return this.updateLogStatus(id, EmailStatus.SENT);
  }

  async markAsFailed(id: string, errorMessage: string) {
    return this.updateLogStatus(id, EmailStatus.FAILED, errorMessage);
  }

  async markAsBounced(id: string, errorMessage?: string) {
    return this.updateLogStatus(id, EmailStatus.BOUNCED, errorMessage);
  }

  /**
   * 특정 사용자의 이메일 로그 조회
   */
  async findUserEmailLogs(
    userId: string,
    options: Omit<FindEmailLogsOptions, 'userId'> = {},
  ) {
    return this.findLogs({ ...options, userId });
  }

  /**
   * 특정 템플릿의 이메일 로그 조회
   */
  async findTemplateEmailLogs(
    templateId: string,
    options: Omit<FindEmailLogsOptions, 'templateId'> = {},
  ) {
    return this.findLogs({ ...options, templateId });
  }

  /**
   * 실패한 이메일 로그 조회
   */
  async findFailedEmailLogs(
    options: Omit<FindEmailLogsOptions, 'status'> = {},
  ) {
    return this.findLogs({ ...options, status: EmailStatus.FAILED });
  }
}
