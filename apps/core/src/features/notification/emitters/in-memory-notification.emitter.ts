import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { NotificationDto } from '../dto/notification.dto';
import { INotificationEmitter } from './notification-emitter.interface';

@Injectable()
export class InMemoryNotificationEmitter implements INotificationEmitter {
  private readonly subjects = new Map<string, Subject<NotificationDto>>();

  emit(userId: string, notification: NotificationDto): void {
    const subject = this.subjects.get(userId);
    if (subject) {
      subject.next(notification);
    }
  }

  subscribe(userId: string): Observable<NotificationDto> {
    if (!this.subjects.has(userId)) {
      this.subjects.set(userId, new Subject<NotificationDto>());
    }
    return this.subjects.get(userId)!.asObservable();
  }

  cleanup(userId: string): void {
    const subject = this.subjects.get(userId);
    if (subject) {
      subject.complete();
      this.subjects.delete(userId);
    }
  }
}
