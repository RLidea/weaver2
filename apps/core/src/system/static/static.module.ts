import { Module } from '@nestjs/common';
import { StaticController } from './controllers/static.controller';

@Module({
  controllers: [StaticController],
})
export class StaticModule {}
