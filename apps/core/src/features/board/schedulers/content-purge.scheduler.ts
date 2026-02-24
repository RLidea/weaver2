import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  SystemSettingService,
  CONFIG_KEYS,
} from '../../../infrastructure/config/system-setting.service';
import { ContentPurgeService } from '../services/content-purge.service';

@Injectable()
export class ContentPurgeScheduler {
  private readonly logger = new Logger(ContentPurgeScheduler.name);

  constructor(
    private readonly systemSettingService: SystemSettingService,
    private readonly contentPurgeService: ContentPurgeService,
  ) {}

  @Cron('0 * * * *')
  async handleAutoPurge() {
    const retentionDaysRaw = await this.systemSettingService.getRaw(
      CONFIG_KEYS.CONTENT_PURGE_RETENTION_DAYS,
    );

    if (!retentionDaysRaw) {
      this.logger.debug(
        'Auto purge skipped: contentPurgeRetentionDays is not set.',
      );
      return;
    }

    const scheduleHourRaw = await this.systemSettingService.getRaw(
      CONFIG_KEYS.CONTENT_PURGE_SCHEDULE_HOUR,
    );
    const scheduleHour = parseInt(scheduleHourRaw ?? '3', 10);
    const currentHour = new Date().getHours();

    if (currentHour !== scheduleHour) {
      return;
    }

    const retentionDays = parseInt(retentionDaysRaw, 10);
    this.logger.log(
      `Auto purge started. retentionDays=${retentionDays}, scheduleHour=${scheduleHour}`,
    );

    try {
      const result =
        await this.contentPurgeService.purgeDeletedContent(retentionDays);
      this.logger.log(
        `Auto purge done. boards=${result.purgedBoards}, posts=${result.purgedPosts}, comments=${result.purgedComments}`,
      );
    } catch (error) {
      this.logger.error(
        'Auto purge failed.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
