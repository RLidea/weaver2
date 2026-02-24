import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@weaver2/prisma';
import { ContentPurgeService } from '../services/content-purge.service';

@Injectable()
export class ContentPurgeScheduler {
  private readonly logger = new Logger(ContentPurgeScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contentPurgeService: ContentPurgeService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleAutoPurge() {
    const settings = await this.prisma.systemSetting.findFirst({
      select: { contentPurgeRetentionDays: true },
    });

    const retentionDays = settings?.contentPurgeRetentionDays;

    if (!retentionDays) {
      this.logger.debug(
        'Auto purge skipped: contentPurgeRetentionDays is not set.',
      );
      return;
    }

    this.logger.log(`Auto purge started. retentionDays=${retentionDays}`);

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
