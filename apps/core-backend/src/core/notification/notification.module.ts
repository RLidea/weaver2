import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { NotificationController } from './controllers/notification.controller';
import { NotificationService } from './services/notification.service';
import { NotificationListener } from './listeners/notification.listener';
import { InMemoryNotificationEmitter } from './emitters/in-memory-notification.emitter';
import { NOTIFICATION_EMITTER } from './emitters/notification-emitter.interface';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationListener,
    {
      provide: NOTIFICATION_EMITTER,
      useClass: InMemoryNotificationEmitter,
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
