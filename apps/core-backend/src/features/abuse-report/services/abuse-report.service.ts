import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { AbuseReportDto } from '../dto/abuse-report.dto';
import { CreateAbuseReportDto } from '../dto/create-abuse-report.dto';
import { ResolveAbuseReportDto } from '../dto/resolve-abuse-report.dto';
import { AbuseReportsQueryDto } from '../dto/abuse-reports-query.dto';
import { CreateAbuseReportCommand } from '../repositories/create-abuse-report.command';
import {
  FindAbuseReportByIdQuery,
  FindAbuseReportsQuery,
} from '../repositories/find-abuse-reports.query';
import { UpdateAbuseReportStatusCommand } from '../repositories/update-abuse-report.command';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationEventDto } from '../../../core/notification/dto/notification-event.dto';

@Injectable()
export class AbuseReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createReport(
    reporterId: string,
    dto: CreateAbuseReportDto,
  ): Promise<AbuseReportDto> {
    // 중복 신고 체크
    const existing = await this.prisma.abuseReport.findUnique({
      where: {
        reporterId_targetType_targetId: {
          reporterId,
          targetType: dto.targetType,
          targetId: dto.targetId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('이미 해당 콘텐츠를 신고하셨습니다.');
    }

    // 자기 자신 신고 방지 (USER 타입)
    if (dto.targetType === 'USER' && dto.targetId === reporterId) {
      throw new BadRequestException('자기 자신을 신고할 수 없습니다.');
    }

    const report = await CreateAbuseReportCommand(this.prisma, {
      reporterId,
      ...dto,
    });
    return report as AbuseReportDto;
  }

  async findReports(dto: AbuseReportsQueryDto) {
    return FindAbuseReportsQuery(
      this.prisma,
      { status: dto.status, targetType: dto.targetType },
      dto.cursor,
      dto.limit ? Number(dto.limit) : 20,
    );
  }

  async findReportById(id: string): Promise<AbuseReportDto> {
    const report = await FindAbuseReportByIdQuery(this.prisma, id);
    if (!report) {
      throw new NotFoundException(`Report with ID '${id}' not found.`);
    }
    return report as AbuseReportDto;
  }

  async startReview(id: string, moderatorId: string): Promise<AbuseReportDto> {
    const report = await this.findReportById(id);
    if (report.status !== 'PENDING') {
      throw new BadRequestException(
        'PENDING 상태의 신고만 검토 시작할 수 있습니다.',
      );
    }
    const updated = await UpdateAbuseReportStatusCommand(this.prisma, id, {
      status: 'REVIEWING',
      resolvedById: moderatorId,
    });
    return updated as AbuseReportDto;
  }

  async resolveReport(
    id: string,
    moderatorId: string,
    dto: ResolveAbuseReportDto,
  ): Promise<AbuseReportDto> {
    const report = await this.findReportById(id);
    if (report.status === 'RESOLVED' || report.status === 'DISMISSED') {
      throw new BadRequestException('이미 처리된 신고입니다.');
    }

    const updated = await UpdateAbuseReportStatusCommand(this.prisma, id, {
      status: 'RESOLVED',
      resolvedById: moderatorId,
      resolvedAt: new Date(),
      actionTaken: dto.actionTaken,
      moderatorNote: dto.moderatorNote,
    });

    // 신고자에게 처리 결과 알림
    const event: NotificationEventDto = {
      recipientId: report.reporterId,
      actorId: moderatorId,
      type: 'SYSTEM',
      title: '신고가 처리되었습니다',
      body: `접수하신 신고가 검토 후 처리되었습니다.`,
    };
    this.eventEmitter.emit('notification.created', event);

    return updated as AbuseReportDto;
  }

  async dismissReport(
    id: string,
    moderatorId: string,
    moderatorNote?: string,
  ): Promise<AbuseReportDto> {
    const report = await this.findReportById(id);
    if (report.status === 'RESOLVED' || report.status === 'DISMISSED') {
      throw new BadRequestException('이미 처리된 신고입니다.');
    }

    const updated = await UpdateAbuseReportStatusCommand(this.prisma, id, {
      status: 'DISMISSED',
      resolvedById: moderatorId,
      resolvedAt: new Date(),
      actionTaken: 'NO_ACTION',
      moderatorNote,
    });

    // 신고자에게 기각 알림
    const event: NotificationEventDto = {
      recipientId: report.reporterId,
      actorId: moderatorId,
      type: 'SYSTEM',
      title: '신고가 기각되었습니다',
      body: '접수하신 신고를 검토한 결과 규정 위반이 확인되지 않았습니다.',
    };
    this.eventEmitter.emit('notification.created', event);

    return updated as AbuseReportDto;
  }
}
