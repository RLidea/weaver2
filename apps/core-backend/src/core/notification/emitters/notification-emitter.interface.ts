import { Observable } from 'rxjs';
import { NotificationDto } from '../dto/notification.dto';

export const NOTIFICATION_EMITTER = Symbol('NOTIFICATION_EMITTER');

export interface INotificationEmitter {
  emit(userId: string, notification: NotificationDto): void;
  subscribe(userId: string): Observable<NotificationDto>;
  cleanup(userId: string): void;
}
