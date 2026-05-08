import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '@weaver2/prisma';
import { SavePushSubscriptionCommand } from '../repositories/save-push-subscription.command';
import { DeletePushSubscriptionCommand } from '../repositories/delete-push-subscription.command';
import { FindPushSubscriptionsByUserQuery } from '../repositories/find-push-subscriptions-by-user.query';

export interface PushPayload {
  title: string;
  body: string;
  link?: string;
}

@Injectable()
export class PushSubscriptionService implements OnModuleInit {
  private readonly logger = new Logger(PushSubscriptionService.name);
  private pushEnabled = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      this.logger.warn(
        'VAPID keys not configured (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY). Web push notifications are disabled.',
      );
      return;
    }

    try {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT ?? 'mailto:admin@weaver2.local',
        publicKey,
        privateKey,
      );
      this.pushEnabled = true;
    } catch (error) {
      this.logger.error(
        'Failed to configure VAPID details. Web push disabled.',
        error,
      );
    }
  }

  getPublicKey(): string {
    return process.env.VAPID_PUBLIC_KEY ?? '';
  }

  async save(data: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }) {
    return SavePushSubscriptionCommand(this.prisma, data);
  }

  async delete(endpoint: string, userId: string) {
    return DeletePushSubscriptionCommand(this.prisma, endpoint, userId);
  }

  async sendToUser(userId: string, payload: PushPayload) {
    if (!this.pushEnabled) return;

    const subscriptions = await FindPushSubscriptionsByUserQuery(
      this.prisma,
      userId,
    );

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload),
          );
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 410 || statusCode === 404) {
            // 만료된 구독 자동 삭제
            await DeletePushSubscriptionCommand(
              this.prisma,
              sub.endpoint,
              userId,
            );
            this.logger.log(
              `Removed expired push subscription for user ${userId}`,
            );
          } else {
            this.logger.error(`Push send failed for user ${userId}`, error);
          }
        }
      }),
    );
  }
}
