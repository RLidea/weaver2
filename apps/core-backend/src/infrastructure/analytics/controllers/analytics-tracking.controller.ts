import {
  Controller,
  Post,
  Body,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';
import { PageViewLoggingService } from '../page-view-logging.service';
import {
  TrackBulkPageViewsDto,
  TrackBulkPageViewsResponseDto,
  TrackPageViewDto,
} from '../dto/track-page-view.dto';

@ApiTags('Analytics Tracking')
@Controller({ path: 'analytics/tracking', version: '1' })
@Public() // 비로그인 방문도 센다 — 로그인했으면 그 세션의 사용자로 남긴다
export class AnalyticsTrackingController {
  private readonly logger = new Logger(AnalyticsTrackingController.name);

  constructor(
    private readonly pageViewLoggingService: PageViewLoggingService,
  ) {}

  /** 누가 · 어디서 · 무엇으로 왔는지는 세션과 요청에서만 읽는다 */
  private toPageViewData(
    trackData: TrackPageViewDto,
    req: Request,
    authUser?: CommonAuthUserDto,
  ) {
    return {
      pageUrl: trackData.pageUrl,
      userId: authUser?.isLogin ? authUser.id : null,
      ipAddress: req.ip ?? null,
      referrer: trackData.referrer || req.headers.referer || null,
      userAgent: req.headers['user-agent'] || null,
    };
  }

  @Post('page-view')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({
    summary: '페이지뷰 트래킹',
    description: `
페이지 방문 한 건을 기록한다. 기록은 30일 뒤 지운다.

- 로그인한 요청이면 그 사용자로, 아니면 익명으로 남긴다. userId 는 본문으로 받지 않는다.
- IP · User-Agent 는 요청에서 읽는다.
- 기록에 실패해도 200 을 돌려준다 — 트래킹이 화면을 막지 않게.
    `,
  })
  @ApiOkResponse({ description: '기록했거나 시도했다 (data 는 비어 있다)' })
  async trackPageView(
    @Body() trackData: TrackPageViewDto,
    @Req() req: Request,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<{ message: string }> {
    const pageViewData = this.toPageViewData(trackData, req, authUser);
    try {
      await this.pageViewLoggingService.logPageView(pageViewData);
      return { message: 'Page view tracked' };
    } catch (error) {
      // 트래킹 실패가 사용자 경험을 해치지 않도록 성공으로 답한다
      this.logger.error('Failed to track page view:', error);
      return { message: 'Page view tracking attempted' };
    }
  }

  @Post('bulk-page-views')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: '대량 페이지뷰 트래킹',
    description: `
오프라인에서 쌓인 방문을 한 번에 보낸다. 한 번에 1~100개.
누가 · 어디서 · 무엇으로는 page-view 와 같이 이 요청에서 읽는다. 일부가 실패해도 나머지는 기록한다.
    `,
  })
  @ApiOkResponse({ type: TrackBulkPageViewsResponseDto })
  async trackBulkPageViews(
    @Body() bulkData: TrackBulkPageViewsDto,
    @Req() req: Request,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<TrackBulkPageViewsResponseDto> {
    let processed = 0;
    let failed = 0;

    for (const trackData of bulkData.pageViews) {
      try {
        await this.pageViewLoggingService.logPageView(
          this.toPageViewData(trackData, req, authUser),
        );
        processed++;
      } catch (error) {
        this.logger.error(
          `Failed to track page view: ${trackData.pageUrl}`,
          error,
        );
        failed++;
      }
    }

    // 값만 돌려준다 — SuccessInterceptor 가 { message, data } 로 감싼다
    return { processed, failed };
  }
}
