import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
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
    @Inject(NOTIFICATION_EMITTER)
    private readonly notificationEmitter: INotificationEmitter,
  ) {}

  @OnEvent('notification.created')
  async handleNotificationCreated(
    payload: NotificationEventDto,
  ): Promise<void> {
    // 자기 자신에게는 알림 안 보냄
    if (payload.recipientId === payload.actorId) return;

    try {
      const notification = await this.notificationService.createNotification({
        userId: payload.recipientId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        link: payload.link,
      });

      this.notificationEmitter.emit(payload.recipientId, notification);
    } catch (error) {
      this.logger.error(
        `Failed to create notification for user ${payload.recipientId}`,
        error,
      );
    }
  }
}
