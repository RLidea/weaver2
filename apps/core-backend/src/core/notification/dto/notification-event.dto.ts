import { NotificationType } from '@weaver2/prisma';

export class NotificationEventDto {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}
