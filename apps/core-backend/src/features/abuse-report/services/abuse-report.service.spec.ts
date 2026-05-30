import { BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AbuseReportService } from './abuse-report.service';
import { PrismaService } from '@weaver2/prisma';

jest.mock('../repositories/create-abuse-report.command', () => ({
  CreateAbuseReportCommand: jest.fn((_p, dto) =>
    Promise.resolve({ id: 'r1', ...dto }),
  ),
}));

jest.mock('../repositories/find-abuse-reports.query', () => ({
  FindAbuseReportByIdQuery: jest.fn(),
  FindAbuseReportsQuery: jest.fn(),
}));

jest.mock('../repositories/update-abuse-report.command', () => ({
  UpdateAbuseReportStatusCommand: jest.fn((_p, id, data) =>
    Promise.resolve({ id, ...data }),
  ),
}));

import { FindAbuseReportByIdQuery } from '../repositories/find-abuse-reports.query';

describe('AbuseReportService.createReport', () => {
  let service: AbuseReportService;
  let prisma: any;
  let emitter: { emit: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = { abuseReport: { findUnique: jest.fn() } };
    emitter = { emit: jest.fn() };
    service = new AbuseReportService(
      prisma as PrismaService,
      emitter as unknown as EventEmitter2,
    );
  });

  it('이미 동일 대상에 신고한 적 있으면 ConflictException', async () => {
    prisma.abuseReport.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.createReport('reporter', {
        targetType: 'POST',
        targetId: 'p1',
        reason: 'spam',
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('자기 자신(USER)을 신고하려 하면 BadRequestException', async () => {
    prisma.abuseReport.findUnique.mockResolvedValue(null);

    await expect(
      service.createReport('me', {
        targetType: 'USER',
        targetId: 'me',
        reason: 'self',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('정상 신고 → CreateAbuseReportCommand 결과 반환', async () => {
    prisma.abuseReport.findUnique.mockResolvedValue(null);

    const result = await service.createReport('reporter', {
      targetType: 'POST',
      targetId: 'p1',
      reason: 'rude',
    } as any);

    expect(result).toMatchObject({ id: 'r1', targetType: 'POST' });
  });
});

describe('AbuseReportService.resolveReport / dismissReport', () => {
  let service: AbuseReportService;
  let prisma: any;
  let emitter: { emit: jest.Mock };
  const mockFindById = FindAbuseReportByIdQuery as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {};
    emitter = { emit: jest.fn() };
    service = new AbuseReportService(
      prisma as PrismaService,
      emitter as unknown as EventEmitter2,
    );
  });

  it('이미 RESOLVED인 신고를 resolve → BadRequestException', async () => {
    mockFindById.mockResolvedValue({ id: 'r1', status: 'RESOLVED' });

    await expect(
      service.resolveReport('r1', 'mod', {
        actionTaken: 'CONTENT_HIDDEN',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('이미 DISMISSED인 신고를 dismiss → BadRequestException', async () => {
    mockFindById.mockResolvedValue({ id: 'r1', status: 'DISMISSED' });

    await expect(service.dismissReport('r1', 'mod')).rejects.toBeInstanceOf(
      BadRequestException,
    );
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

describe('AbuseReportService.startReview', () => {
  let service: AbuseReportService;
  const mockFindById = FindAbuseReportByIdQuery as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AbuseReportService(
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
