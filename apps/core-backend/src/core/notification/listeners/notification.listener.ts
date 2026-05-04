import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { PushSubscriptionService } from '../services/push-subscription.service';
import {
  INotificationEmitter,
  NOTIFICATION_EMITTER,
} from '../emitters/notification-emitter.interface';
import { NotificationEventDto } from '../dto/notification-event.dto';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly pushSubscriptionService: PushSubscriptionService,
    @Inject(NOTIFICATION_EMITTER)
    private readonly notificationEmitter: INotificationEmitter,
  ) {}

  @OnEvent('notification.created')
  async handleNotificationCreated(
    payload: NotificationEventDto,
  ): Promise<void> {
    if (payload.recipientId === payload.actorId) return;

    try {
      const notification = await this.notificationService.createNotification({
        userId: payload.recipientId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        link: payload.link,
      });

      // SSE + 웹 푸시 병행 발송
      this.notificationEmitter.emit(payload.recipientId, notification);

      void this.pushSubscriptionService.sendToUser(payload.recipientId, {
        title: payload.title,
        body: payload.body,
        link: payload.link,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create notification for user ${payload.recipientId}`,
        error,
      );
    }
  }
}
