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
});
