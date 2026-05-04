import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  Sse,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Observable, finalize } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthUser } from '@weaver2/common';
import { CommonAuthUserDto } from '@weaver2/common';
import { NotificationService } from '../services/notification.service';
import { PushSubscriptionService } from '../services/push-subscription.service';
import {
  INotificationEmitter,
  NOTIFICATION_EMITTER,
} from '../emitters/notification-emitter.interface';
import { NotificationDto } from '../dto/notification.dto';
import {
  SavePushSubscriptionDto,
  DeletePushSubscriptionDto,
} from '../dto/save-push-subscription.dto';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { Request } from 'express';

@ApiTags('Notification')
@Controller({ path: 'notifications', version: '1' })
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly pushSubscriptionService: PushSubscriptionService,
    @Inject(NOTIFICATION_EMITTER)
    private readonly notificationEmitter: INotificationEmitter,
  ) {}

  @Get('push-subscription/public-key')
  @ApiOperation({ summary: 'VAPID 공개키 조회' })
  getVapidPublicKey(): { publicKey: string } {
    return { publicKey: this.pushSubscriptionService.getPublicKey() };
  }

  @Post('push-subscription')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '웹 푸시 구독 저장' })
  @ApiStandardResponses({ status: 204, description: 'Subscription saved' })
  async savePushSubscription(
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() dto: SavePushSubscriptionDto,
  ): Promise<void> {
    await this.pushSubscriptionService.save({ userId: authUser.id, ...dto });
  }

  @Delete('push-subscription')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '웹 푸시 구독 해제' })
  @ApiStandardResponses({ status: 204, description: 'Subscription deleted' })
  async deletePushSubscription(
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() dto: DeletePushSubscriptionDto,
  ): Promise<void> {
    await this.pushSubscriptionService.delete(dto.endpoint, authUser.id);
  }

  @Get()
  @ApiOperation({ summary: '알림 목록 조회 (keyset pagination)' })
  @ApiStandardResponses({ type: NotificationDto, isArray: true })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findNotifications(
    @AuthUser() authUser: CommonAuthUserDto,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.notificationService.findNotificationsByUserId(
      authUser.id,
      cursor,
      limit ? Number(limit) : 20,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: '미읽음 알림 수' })
  @ApiStandardResponses({ type: Number })
  async getUnreadCount(
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<{ count: number }> {
    const count = await this.notificationService.countUnread(authUser.id);
    return { count };
  }

  @Sse('stream')
  @ApiOperation({ summary: 'SSE 알림 스트림' })
  sseStream(
    @Req() req: Request,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Observable<MessageEvent> {
    const userId = authUser.id;

    req.on('close', () => {
      this.notificationEmitter.cleanup(userId);
    });

    return this.notificationEmitter.subscribe(userId).pipe(
      finalize(() => this.notificationEmitter.cleanup(userId)),
      map(
        (notification) =>
          ({
            data: notification,
          }) as MessageEvent,
      ),
    );
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '개별 알림 읽음 처리' })
  @ApiStandardResponses({
    status: 204,
    description: 'Notification marked as read',
  })
  async markRead(
    @Param('id') id: string,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<void> {
    await this.notificationService.markRead(id, authUser.id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '전체 알림 읽음 처리' })
  @ApiStandardResponses({
    status: 204,
    description: 'All notifications marked as read',
  })
  async markAllRead(@AuthUser() authUser: CommonAuthUserDto): Promise<void> {
    await this.notificationService.markAllRead(authUser.id);
  }
}
