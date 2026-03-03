import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { ReportDto } from '../dto/report.dto';
import { CreateReportDto } from '../dto/create-report.dto';
import { ResolveReportDto } from '../dto/resolve-report.dto';
import { ReportsQueryDto } from '../dto/reports-query.dto';
import { CreateReportCommand } from '../repositories/create-report.command';
import {
  FindReportByIdQuery,
  FindReportsQuery,
} from '../repositories/find-reports.query';
import { UpdateReportStatusCommand } from '../repositories/update-report.command';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationEventDto } from '../../../features/notification/dto/notification-event.dto';

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createReport(
    reporterId: string,
    dto: CreateReportDto,
  ): Promise<ReportDto> {
    // 중복 신고 체크
    const existing = await this.prisma.report.findUnique({
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

    const report = await CreateReportCommand(this.prisma, {
      reporterId,
      ...dto,
    });
    return report as ReportDto;
  }

  async findReports(dto: ReportsQueryDto) {
    return FindReportsQuery(
      this.prisma,
      { status: dto.status, targetType: dto.targetType },
      dto.cursor,
      dto.limit ? Number(dto.limit) : 20,
    );
  }

  async findReportById(id: string): Promise<ReportDto> {
    const report = await FindReportByIdQuery(this.prisma, id);
    if (!report) {
      throw new NotFoundException(`Report with ID '${id}' not found.`);
    }
    return report as ReportDto;
  }

  async startReview(id: string, moderatorId: string): Promise<ReportDto> {
    const report = await this.findReportById(id);
    if (report.status !== 'PENDING') {
      throw new BadRequestException(
        'PENDING 상태의 신고만 검토 시작할 수 있습니다.',
      );
    }
    const updated = await UpdateReportStatusCommand(this.prisma, id, {
      status: 'REVIEWING',
      resolvedById: moderatorId,
    });
    return updated as ReportDto;
  }

  async resolveReport(
    id: string,
    moderatorId: string,
    dto: ResolveReportDto,
  ): Promise<ReportDto> {
    const report = await this.findReportById(id);
    if (report.status === 'RESOLVED' || report.status === 'DISMISSED') {
      throw new BadRequestException('이미 처리된 신고입니다.');
    }

    const updated = await UpdateReportStatusCommand(this.prisma, id, {
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

    return updated as ReportDto;
  }

  async dismissReport(
    id: string,
    moderatorId: string,
    moderatorNote?: string,
  ): Promise<ReportDto> {
    const report = await this.findReportById(id);
    if (report.status === 'RESOLVED' || report.status === 'DISMISSED') {
      throw new BadRequestException('이미 처리된 신고입니다.');
    }

    const updated = await UpdateReportStatusCommand(this.prisma, id, {
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

    return updated as ReportDto;
  }
}
