import { NotificationListener } from './notification.listener';
import { NotificationService } from '../services/notification.service';
import { PushSubscriptionService } from '../services/push-subscription.service';
import { INotificationEmitter } from '../emitters/notification-emitter.interface';

describe('NotificationListener', () => {
  let listener: NotificationListener;
  let notification: { createNotification: jest.Mock };
  let push: { sendToUser: jest.Mock };
  let emitter: { emit: jest.Mock };

  beforeEach(() => {
    notification = {
      createNotification: jest.fn(async () => ({ id: 'n1' })),
    };
    push = { sendToUser: jest.fn(async () => undefined) };
    emitter = { emit: jest.fn() };

    listener = new NotificationListener(
      notification as unknown as NotificationService,
      push as unknown as PushSubscriptionService,
      emitter as unknown as INotificationEmitter,
    );
  });

  it('자기 자신에게 가는 알림은 createNotification/SSE/push 모두 호출되지 않는다', async () => {
    await listener.handleNotificationCreated({
      recipientId: 'user-1',
      actorId: 'user-1',
      type: 'COMMENT',
      title: 't',
      body: 'b',
    });

    expect(notification.createNotification).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
    expect(push.sendToUser).not.toHaveBeenCalled();
  });

  it('정상 흐름 — DB 저장 + SSE emit + 웹 푸시 호출', async () => {
    await listener.handleNotificationCreated({
      recipientId: 'recipient',
      actorId: 'actor',
      type: 'COMMENT',
      title: '새 댓글',
      body: '내용',
      link: '/boards/1/posts/2',
    });

    expect(notification.createNotification).toHaveBeenCalledWith({
      userId: 'recipient',
      type: 'COMMENT',
      title: '새 댓글',
      body: '내용',
      link: '/boards/1/posts/2',
    });
    expect(emitter.emit).toHaveBeenCalledWith('recipient', { id: 'n1' });
    expect(push.sendToUser).toHaveBeenCalledWith('recipient', {
      title: '새 댓글',
      body: '내용',
      link: '/boards/1/posts/2',
    });
  });

  it('createNotification 실패 시 SSE/push 호출되지 않고 에러는 swallow', async () => {
    notification.createNotification.mockRejectedValue(new Error('db down'));

    await expect(
      listener.handleNotificationCreated({
        recipientId: 'recipient',
        actorId: 'actor',
        type: 'COMMENT',
        title: 't',
        body: 'b',
      }),
    ).resolves.toBeUndefined();

    expect(emitter.emit).not.toHaveBeenCalled();
    expect(push.sendToUser).not.toHaveBeenCalled();
  });
});
