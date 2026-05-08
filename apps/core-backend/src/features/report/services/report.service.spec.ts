import { BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReportService } from './report.service';
import { PrismaService } from '@weaver2/prisma';

jest.mock('../repositories/create-report.command', () => ({
  CreateReportCommand: jest.fn(async (_p, dto) => ({ id: 'r1', ...dto })),
}));

jest.mock('../repositories/find-reports.query', () => ({
  FindReportByIdQuery: jest.fn(),
  FindReportsQuery: jest.fn(),
}));

jest.mock('../repositories/update-report.command', () => ({
  UpdateReportStatusCommand: jest.fn(async (_p, id, data) => ({ id, ...data })),
}));

import { FindReportByIdQuery } from '../repositories/find-reports.query';

describe('ReportService.createReport', () => {
  let service: ReportService;
  let prisma: any;
  let emitter: { emit: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = { report: { findUnique: jest.fn() } };
    emitter = { emit: jest.fn() };
    service = new ReportService(
      prisma as PrismaService,
      emitter as unknown as EventEmitter2,
    );
  });

  it('이미 동일 대상에 신고한 적 있으면 ConflictException', async () => {
    prisma.report.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.createReport('reporter', {
        targetType: 'POST',
        targetId: 'p1',
        reason: 'spam',
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('자기 자신(USER)을 신고하려 하면 BadRequestException', async () => {
    prisma.report.findUnique.mockResolvedValue(null);

    await expect(
      service.createReport('me', {
        targetType: 'USER',
        targetId: 'me',
        reason: 'self',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('정상 신고 → CreateReportCommand 결과 반환', async () => {
    prisma.report.findUnique.mockResolvedValue(null);

    const result = await service.createReport('reporter', {
      targetType: 'POST',
      targetId: 'p1',
      reason: 'rude',
    } as any);

    expect(result).toMatchObject({ id: 'r1', targetType: 'POST' });
  });
});

describe('ReportService.resolveReport / dismissReport', () => {
  let service: ReportService;
  let prisma: any;
  let emitter: { emit: jest.Mock };
  const mockFindById = FindReportByIdQuery as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {};
    emitter = { emit: jest.fn() };
    service = new ReportService(
      prisma as PrismaService,
      emitter as unknown as EventEmitter2,
    );
  });

  it('이미 RESOLVED인 신고를 resolve → BadRequestException', async () => {
    mockFindById.mockResolvedValue({ id: 'r1', status: 'RESOLVED' });

    await expect(
      service.resolveReport('r1', 'mod', { actionTaken: 'CONTENT_HIDDEN' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('이미 DISMISSED인 신고를 dismiss → BadRequestException', async () => {
    mockFindById.mockResolvedValue({ id: 'r1', status: 'DISMISSED' });

    await expect(
      service.dismissReport('r1', 'mod'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('정상 resolve 시 신고자에게 SYSTEM 알림 emit', async () => {
    mockFindById.mockResolvedValue({
      id: 'r1',
      status: 'PENDING',
      reporterId: 'reporter',
    });

    await service.resolveReport('r1', 'mod', {
      actionTaken: 'CONTENT_HIDDEN',
    } as any);

    expect(emitter.emit).toHaveBeenCalledWith(
      'notification.created',
      expect.objectContaining({
        recipientId: 'reporter',
        actorId: 'mod',
        type: 'SYSTEM',
      }),
    );
  });

  it('정상 dismiss 시 신고자에게 SYSTEM 알림 emit', async () => {
    mockFindById.mockResolvedValue({
      id: 'r1',
      status: 'REVIEWING',
      reporterId: 'reporter',
    });

    await service.dismissReport('r1', 'mod', 'reason');

    expect(emitter.emit).toHaveBeenCalledWith(
      'notification.created',
      expect.objectContaining({ recipientId: 'reporter', type: 'SYSTEM' }),
    );
  });
});

describe('ReportService.startReview', () => {
  let service: ReportService;
  const mockFindById = FindReportByIdQuery as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportService(
      {} as PrismaService,
      { emit: jest.fn() } as unknown as EventEmitter2,
    );
  });

  it('PENDING이 아닌 신고는 검토 시작 거부', async () => {
    mockFindById.mockResolvedValue({ id: 'r1', status: 'REVIEWING' });

    await expect(service.startReview('r1', 'mod')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('PENDING 신고는 REVIEWING으로 전환', async () => {
    mockFindById.mockResolvedValue({ id: 'r1', status: 'PENDING' });

    const result = await service.startReview('r1', 'mod');
    expect(result).toMatchObject({ status: 'REVIEWING' });
  });
});
