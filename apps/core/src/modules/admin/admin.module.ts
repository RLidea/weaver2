import { Module } from '@nestjs/common';
import { AdminApiModule } from './api/admin-api.module';
import { AdminViewModule } from './view/admin-view.module';

@Module({
  imports: [AdminApiModule, AdminViewModule],
})
export class AdminModule {}