import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { NotificationDto } from '../dto/notification.dto';
import { CreateNotificationCommand } from '../repositories/create-notification.command';
import { FindNotificationsByUserIdQuery } from '../repositories/find-notifications-by-user-id.query';
import {
  MarkNotificationReadCommand,
  MarkAllNotificationsReadCommand,
} from '../repositories/mark-notification-read.command';
import { CountUnreadNotificationsQuery } from '../repositories/count-unread-notifications.query';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
  }): Promise<NotificationDto> {
    const notification = await CreateNotificationCommand(this.prisma, data);
    return notification as NotificationDto;
  }

  async findNotificationsByUserId(userId: string, cursor?: string, limit = 20) {
    return FindNotificationsByUserIdQuery(this.prisma, userId, cursor, limit);
  }

  async countUnread(userId: string): Promise<number> {
    return CountUnreadNotificationsQuery(this.prisma, userId);
  }

  async markRead(id: string, userId: string): Promise<void> {
    const result = await MarkNotificationReadCommand(this.prisma, id, userId);
    if (result.count === 0) {
      throw new NotFoundException(`Notification with ID '${id}' not found.`);
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await MarkAllNotificationsReadCommand(this.prisma, userId);
  }
}
