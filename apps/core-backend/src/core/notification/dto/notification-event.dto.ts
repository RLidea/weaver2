import { NotificationType } from '@prisma/client';

export class NotificationEventDto {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}
