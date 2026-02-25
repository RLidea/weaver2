import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  SystemSettingService,
  CONFIG_KEYS,
} from '../../../infrastructure/config/system-setting.service';
import { ContentPurgeService } from '../services/content-purge.service';
import { UploadService } from '@weaver2/upload';

@Injectable()
export class ContentPurgeScheduler {
  private readonly logger = new Logger(ContentPurgeScheduler.name);

  constructor(
    private readonly systemSettingService: SystemSettingService,
    private readonly contentPurgeService: ContentPurgeService,
    private readonly uploadService: UploadService,
  ) {}

  @Cron('0 * * * *')
  async handleAutoPurge() {
    const scheduleHourRaw = await this.systemSettingService.getRaw(
      CONFIG_KEYS.CONTENT_PURGE_SCHEDULE_HOUR,
    );
    const scheduleHour = parseInt(scheduleHourRaw ?? '3', 10);
    const currentHour = new Date().getHours();

    if (currentHour !== scheduleHour) {
      return;
    }

    await this.purgeContent();
    await this.purgeOrphanFiles();
  }

  private async purgeContent(): Promise<void> {
    const retentionDaysRaw = await this.systemSettingService.getRaw(
      CONFIG_KEYS.CONTENT_PURGE_RETENTION_DAYS,
    );

    if (!retentionDaysRaw) {
      this.logger.debug(
        'Content purge skipped: contentPurgeRetentionDays is not set.',
      );
      return;
    }

    const retentionDays = parseInt(retentionDaysRaw, 10);
    this.logger.log(`Content purge started. retentionDays=${retentionDays}`);

    try {
      const result =
        await this.contentPurgeService.purgeDeletedContent(retentionDays);
      this.logger.log(
        `Content purge done. boards=${result.purgedBoards}, posts=${result.purgedPosts}, comments=${result.purgedComments}`,
      );
    } catch (error) {
      this.logger.error(
        'Content purge failed.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async purgeOrphanFiles(): Promise<void> {
    const retentionHoursRaw = await this.systemSettingService.getRaw(
      CONFIG_KEYS.UPLOAD_ORPHAN_RETENTION_HOURS,
    );

    if (!retentionHoursRaw) {
      this.logger.debug(
        'Orphan file purge skipped: uploadOrphanRetentionHours is not set.',
      );
      return;
    }

    const retentionHours = parseInt(retentionHoursRaw, 10);
    this.logger.log(
      `Orphan file purge started. retentionHours=${retentionHours}`,
    );

    try {
      const purgedCount =
        await this.uploadService.purgeOrphanedFiles(retentionHours);
      this.logger.log(`Orphan file purge done. purgedFiles=${purgedCount}`);
    } catch (error) {
      this.logger.error(
        'Orphan file purge failed.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
