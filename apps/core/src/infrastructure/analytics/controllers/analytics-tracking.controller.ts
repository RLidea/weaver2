import {
  Controller,
  Post,
  Body,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { PageViewLoggingService } from '../page-view-logging.service';
import {
  TrackPageViewDto,
  TrackPageViewResponseDto,
} from '../dto/track-page-view.dto';

@ApiTags('Analytics Tracking')
@Controller({ path: 'analytics/tracking', version: '1' })
@Public() // 인증 없이 접근 가능
export class AnalyticsTrackingController {
  private readonly logger = new Logger(AnalyticsTrackingController.name);

  constructor(
    private readonly pageViewLoggingService: PageViewLoggingService,
  ) {}

  @Post('page-view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '페이지뷰 트래킹',
    description: `
사용자의 페이지 방문을 기록하는 API입니다.

**주요 기능:**
- 페이지 URL별 방문 통계 수집
- 유입 경로 분석 (Direct, Search, Social, Referral)
- 로그인/비로그인 사용자 구분 추적
- IP 주소 및 브라우저 정보 수집

**사용 시나리오:**
1. **SPA 라우팅**: React/Vue 등에서 페이지 이동 시 호출
2. **페이지 로드**: 일반 웹페이지 로드 완료 시 호출
3. **이벤트 기반**: 특정 액션 완료 시 호출

**데이터 보관 정책:**
- 원본 로그: 30일간 보관 после 자동 삭제
- 월간 집계: 영구 보관
- 개인정보: IP는 익명화 처리됨

**성능 고려사항:**
- 비동기 처리로 응답 속도에 영향 없음
- 실패해도 사용자 경험에 지장 없음
- 중복 호출 방지 권장 (클라이언트에서 debounce 처리)

  🚀 프론트엔드에서 사용 방법

  // React/Vue 등에서 페이지 이동 시
  const trackPageView = async (pageUrl, userId = null) => {
    try {
      await fetch('/v1/analytics/tracking/page-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageUrl,
          userId,
          referrer: document.referrer
        })
      });
    } catch (error) {
      // 트래킹 실패해도 사용자 경험에 영향 없음
      console.warn('Analytics tracking failed:', error);
    }
  };

  // 사용 예시
  trackPageView('/products/smartphone', 'user-123');
    `,
  })
  @ApiBody({
    type: TrackPageViewDto,
    description: '페이지뷰 트래킹 데이터',
    examples: {
      'basic-page-view': {
        summary: '기본 페이지 방문 (필수 정보만)',
        description: '최소한의 정보로 페이지 방문을 기록합니다.',
        value: {
          pageUrl: '/products/smartphone-galaxy-s24',
        },
      },
      'authenticated-user': {
        summary: '로그인한 사용자의 페이지 방문',
        description: '사용자 ID를 포함한 페이지 방문 기록입니다.',
        value: {
          pageUrl: '/dashboard',
          userId: 'user-uuid-12345',
        },
      },
      'with-referrer': {
        summary: '유입 경로가 있는 페이지 방문',
        description: '검색엔진이나 다른 사이트에서 유입된 경우입니다.',
        value: {
          pageUrl: '/blog/how-to-use-our-service',
          referrer: 'https://google.com/search?q=how+to+use+service',
        },
      },
      'complete-tracking': {
        summary: '모든 정보를 포함한 완전한 트래킹',
        description: '가능한 모든 정보를 포함한 상세 트래킹입니다.',
        value: {
          pageUrl: '/checkout/payment',
          userId: 'user-uuid-67890',
          referrer: 'https://example.com/landing',
          ipAddress: '192.168.1.100',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '페이지뷰가 성공적으로 기록됨',
    type: TrackPageViewResponseDto,
    examples: {
      success: {
        summary: '성공 응답',
        value: {
          success: true,
          message: 'Page view tracked successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 데이터',
    examples: {
      'validation-error': {
        summary: '유효성 검증 실패',
        value: {
          success: false,
          message: 'Validation failed',
          errors: [
            {
              property: 'pageUrl',
              constraints: {
                isString: 'pageUrl must be a string',
                maxLength:
                  'pageUrl must be shorter than or equal to 500 characters',
              },
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: '서버 내부 오류 (트래킹 실패해도 사용자에게는 성공 응답)',
    examples: {
      'internal-error': {
        summary: '내부 오류 (하지만 성공 응답)',
        value: {
          success: true,
          message: 'Page view tracking attempted',
        },
      },
    },
  })
  async trackPageView(
    @Body() trackData: TrackPageViewDto,
    @Req() req: Request,
  ): Promise<TrackPageViewResponseDto> {
    try {
      // 클라이언트에서 제공하지 않은 정보는 요청에서 추출
      const pageViewData = {
        pageUrl: trackData.pageUrl,
        userId: trackData.userId || null,
        ipAddress:
          trackData.ipAddress || req.ip || req.connection.remoteAddress,
        referrer: trackData.referrer || req.headers.referer || null,
        userAgent: trackData.userAgent || req.headers['user-agent'] || null,
      };

      await this.pageViewLoggingService.logPageView(pageViewData);

      this.logger.debug(
        `Page view tracked: ${pageViewData.pageUrl} by ${pageViewData.userId || 'anonymous'}`,
      );

      return {
        success: true,
        message: 'Page view tracked successfully',
      };
    } catch (error) {
      // 트래킹 실패가 사용자 경험을 해치지 않도록 항상 성공 응답
      this.logger.error('Failed to track page view:', error);

      return {
        success: true,
        message: 'Page view tracking attempted',
      };
    }
  }

  @Post('bulk-page-views')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '대량 페이지뷰 트래킹',
    description: `
여러 페이지뷰를 한 번에 기록하는 API입니다.

**사용 사례:**
- 오프라인 상태에서 쌓인 페이지뷰를 온라인 복구 시 일괄 전송
- 배치 처리로 네트워크 요청 수 최적화
- 모바일 앱에서 주기적으로 쌓인 데이터 전송

**제한사항:**
- 한 번에 최대 100개까지 처리
- 각 항목은 개별 유효성 검증 수행
- 일부 실패해도 성공한 항목은 정상 처리
    `,
  })
  @ApiBody({
    description: '페이지뷰 배열 데이터',
    schema: {
      type: 'object',
      properties: {
        pageViews: {
          type: 'array',
          items: { $ref: '#/components/schemas/TrackPageViewDto' },
          maxItems: 100,
          description: '트래킹할 페이지뷰 목록 (최대 100개)',
        },
      },
      required: ['pageViews'],
    },
    examples: {
      'offline-sync': {
        summary: '오프라인 동기화',
        description: '오프라인 상태에서 쌓인 페이지뷰를 일괄 전송합니다.',
        value: {
          pageViews: [
            {
              pageUrl: '/products/item-1',
              userId: 'user-123',
            },
            {
              pageUrl: '/products/item-2',
              userId: 'user-123',
              referrer: '/products/item-1',
            },
            {
              pageUrl: '/checkout',
              userId: 'user-123',
              referrer: '/products/item-2',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '대량 페이지뷰가 처리됨',
    examples: {
      'bulk-success': {
        summary: '대량 처리 성공',
        value: {
          success: true,
          message: 'Bulk page views processed',
          processed: 3,
          failed: 0,
        },
      },
      'partial-success': {
        summary: '일부 성공',
        value: {
          success: true,
          message: 'Bulk page views partially processed',
          processed: 2,
          failed: 1,
        },
      },
    },
  })
  async trackBulkPageViews(
    @Body() bulkData: { pageViews: TrackPageViewDto[] },
    @Req() req: Request,
  ) {
    let processed = 0;
    let failed = 0;

    // 최대 100개 제한
    const pageViews = bulkData.pageViews.slice(0, 100);

    for (const trackData of pageViews) {
      try {
        const pageViewData = {
          pageUrl: trackData.pageUrl,
          userId: trackData.userId || null,
          ipAddress:
            trackData.ipAddress || req.ip || req.connection.remoteAddress,
          referrer: trackData.referrer || req.headers.referer || null,
          userAgent: trackData.userAgent || req.headers['user-agent'] || null,
        };

        await this.pageViewLoggingService.logPageView(pageViewData);
        processed++;
      } catch (error) {
        this.logger.error(
          `Failed to track page view: ${trackData.pageUrl}`,
          error,
        );
        failed++;
      }
    }

    return {
      success: true,
      message:
        failed > 0
          ? 'Bulk page views partially processed'
          : 'Bulk page views processed',
      processed,
      failed,
    };
  }
}
