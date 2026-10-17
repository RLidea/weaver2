import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OneTimeCodeService } from './one-time-code.service';

/** 만료된 일회용 비밀을 매시간 지운다 — 확인 경로는 만료를 보므로 쌓여도 안전하지만 남길 이유가 없다. */
@Injectable()
export class OneTimeCodeScheduler {
  private readonly logger = new Logger(OneTimeCodeScheduler.name);

  constructor(private readonly oneTimeCodeService: OneTimeCodeService) {}

  @Cron('15 * * * *')
  async purgeExpired() {
    const count = await this.oneTimeCodeService.purgeExpired();
    if (count > 0) this.logger.log(`Purged ${count} expired one-time codes.`);
  }
}
