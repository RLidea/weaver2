import { BadRequestException } from '@nestjs/common';
import { AdminAnalyticsApiService } from './admin-analytics.api.service';

// 컨트롤러는 쿼리가 없어도 빈 필터 {} 를 넘긴다 — 그때도 기본 30일로 센다 (전에는 filter.to 가 없어 500)
describe('AdminAnalyticsApiService — 빈 필터', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const count = jest.fn().mockResolvedValue(0);
  const findMany = jest.fn().mockResolvedValue([]);
  const prisma = {
    user: { count },
    post: { count, findMany },
    comment: { count },
    board: { findMany },
    permissionGroup: { findMany },
  };
  const service = new AdminAnalyticsApiService(prisma as never, {} as never);

  // 시계를 멈춘다 — 시험의 Date.now() 와 서비스의 new Date() 사이에 1ms 만 흘러도 올림(ceil)이 하루를 더 센다
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({
      now: new Date('2026-10-18T03:00:00Z'),
      doNotFake: ['nextTick', 'setImmediate'],
    });
  });
  afterEach(() => jest.useRealTimers());

  it('사용자 분석: 쿼리 없이 {} 면 최근 30일을 하루씩 센다', async () => {
    const res = await service.getUserAnalytics({});
    expect(res.signupTrends).toHaveLength(30);
    expect(res.userActivity).toHaveLength(30);
  });

  it('콘텐츠 분석: from 만 오면 to 는 지금까지', async () => {
    const res = await service.getContentAnalytics({
      from: new Date(Date.now() - 3 * DAY),
    });
    expect(res.postTrends).toHaveLength(3);
  });

  it('from 이 to 보다 늦으면 세지 않고 400', async () => {
    await expect(
      service.getUserAnalytics({
        from: new Date(Date.now() - DAY),
        to: new Date(Date.now() - 2 * DAY),
      }),
    ).rejects.toThrow(BadRequestException);
    expect(count).not.toHaveBeenCalled();
  });

  it('366일을 넘는 기간은 세지 않고 400 — 날마다 부르는 count 가 수천 번이 된다', async () => {
    await expect(
      service.getContentAnalytics({ from: new Date('2000-01-01') }),
    ).rejects.toThrow(BadRequestException);
    expect(count).not.toHaveBeenCalled();
  });

  it('to 만 오면 그 30일 전부터 센다', async () => {
    const res = await service.getUserAnalytics({
      to: new Date(Date.now() - 100 * DAY),
    });
    expect(res.signupTrends).toHaveLength(30);
  });
});
