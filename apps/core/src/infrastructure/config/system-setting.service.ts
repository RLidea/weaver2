import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

export const CONFIG_KEYS = {
  SITE_NAME: 'site.name',
  SITE_DESCRIPTION: 'site.description',
  SITE_LOGO_URL: 'site.logoUrl',
  FEATURE_REGISTRATION_OPEN: 'feature.registrationOpen',
  FEATURE_ANNOUNCEMENT_ACTIVE: 'feature.announcementActive',
  FEATURE_ANNOUNCEMENT_MESSAGE: 'feature.announcementMessage',
  FEATURE_ANNOUNCEMENT_TYPE: 'feature.announcementType',
  CONTENT_PURGE_RETENTION_DAYS: 'content.purgeRetentionDays',
  CONTENT_PURGE_SCHEDULE_HOUR: 'content.purgeScheduleHour',
  REACTION_MAX_PER_USER_PER_POST: 'reaction.maxPerUserPerPost',
  UPLOAD_MAX_FILE_SIZE: 'upload.maxFileSize',
  UPLOAD_ALLOWED_MIME_TYPES: 'upload.allowedMimeTypes',
  UPLOAD_THUMBNAIL_WIDTH: 'upload.thumbnailWidth',
  UPLOAD_THUMBNAIL_HEIGHT: 'upload.thumbnailHeight',
} as const;

type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];

const DEFAULTS: Record<ConfigKey, string | null> = {
  [CONFIG_KEYS.SITE_NAME]: 'Weaver2',
  [CONFIG_KEYS.SITE_DESCRIPTION]: 'Community Platform',
  [CONFIG_KEYS.SITE_LOGO_URL]: null,
  [CONFIG_KEYS.FEATURE_REGISTRATION_OPEN]: 'true',
  [CONFIG_KEYS.FEATURE_ANNOUNCEMENT_ACTIVE]: 'false',
  [CONFIG_KEYS.FEATURE_ANNOUNCEMENT_MESSAGE]: null,
  [CONFIG_KEYS.FEATURE_ANNOUNCEMENT_TYPE]: 'info',
  [CONFIG_KEYS.CONTENT_PURGE_RETENTION_DAYS]: null,
  [CONFIG_KEYS.CONTENT_PURGE_SCHEDULE_HOUR]: '3',
  [CONFIG_KEYS.REACTION_MAX_PER_USER_PER_POST]: '1',
  [CONFIG_KEYS.UPLOAD_MAX_FILE_SIZE]: '10485760',
  [CONFIG_KEYS.UPLOAD_ALLOWED_MIME_TYPES]:
    'image/jpeg,image/png,image/gif,image/webp,application/pdf,application/zip',
  [CONFIG_KEYS.UPLOAD_THUMBNAIL_WIDTH]: '300',
  [CONFIG_KEYS.UPLOAD_THUMBNAIL_HEIGHT]: '300',
};

export interface SystemSettingValues {
  siteName: string;
  siteDescription: string;
  logoUrl: string | null;
  isRegistrationOpen: boolean;
  isAnnouncementActive: boolean;
  announcementMessage: string | null;
  announcementType: string;
  contentPurgeRetentionDays: number | null;
  contentPurgeScheduleHour: number;
  reactionMaxPerUserPerPost: number;
  uploadMaxFileSize: number;
  uploadAllowedMimeTypes: string[];
  uploadThumbnailWidth: number;
  uploadThumbnailHeight: number;
}

export interface UpdateSystemSettingDto {
  siteName?: string;
  siteDescription?: string;
  logoUrl?: string | null;
  isRegistrationOpen?: boolean;
  isAnnouncementActive?: boolean;
  announcementMessage?: string | null;
  announcementType?: string;
  contentPurgeRetentionDays?: number | null;
  contentPurgeScheduleHour?: number;
  reactionMaxPerUserPerPost?: number;
  uploadMaxFileSize?: number;
  uploadAllowedMimeTypes?: string[];
  uploadThumbnailWidth?: number;
  uploadThumbnailHeight?: number;
}

@Injectable()
export class SystemSettingService {
  constructor(private readonly prisma: PrismaService) {}

  async getRaw(key: ConfigKey): Promise<string | null> {
    const record = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    if (record) return record.value;
    return DEFAULTS[key];
  }

  async getAll(): Promise<SystemSettingValues> {
    const records = await this.prisma.systemSetting.findMany();
    const map = new Map(records.map((r) => [r.key, r.value]));

    const get = (key: ConfigKey): string | null =>
      map.has(key) ? map.get(key)! : DEFAULTS[key];

    const retentionDaysRaw = get(CONFIG_KEYS.CONTENT_PURGE_RETENTION_DAYS);
    const logoUrlRaw = get(CONFIG_KEYS.SITE_LOGO_URL);
    const announcementMessageRaw = get(
      CONFIG_KEYS.FEATURE_ANNOUNCEMENT_MESSAGE,
    );

    return {
      siteName: get(CONFIG_KEYS.SITE_NAME) ?? 'Weaver2',
      siteDescription:
        get(CONFIG_KEYS.SITE_DESCRIPTION) ?? 'Community Platform',
      logoUrl: logoUrlRaw === '' ? null : logoUrlRaw,
      isRegistrationOpen:
        get(CONFIG_KEYS.FEATURE_REGISTRATION_OPEN) !== 'false',
      isAnnouncementActive:
        get(CONFIG_KEYS.FEATURE_ANNOUNCEMENT_ACTIVE) === 'true',
      announcementMessage:
        announcementMessageRaw === '' ? null : announcementMessageRaw,
      announcementType: get(CONFIG_KEYS.FEATURE_ANNOUNCEMENT_TYPE) ?? 'info',
      contentPurgeRetentionDays: retentionDaysRaw
        ? parseInt(retentionDaysRaw, 10)
        : null,
      contentPurgeScheduleHour: parseInt(
        get(CONFIG_KEYS.CONTENT_PURGE_SCHEDULE_HOUR) ?? '3',
        10,
      ),
      reactionMaxPerUserPerPost: parseInt(
        get(CONFIG_KEYS.REACTION_MAX_PER_USER_PER_POST) ?? '1',
        10,
      ),
      uploadMaxFileSize: parseInt(
        get(CONFIG_KEYS.UPLOAD_MAX_FILE_SIZE) ?? '10485760',
        10,
      ),
      uploadAllowedMimeTypes: (
        get(CONFIG_KEYS.UPLOAD_ALLOWED_MIME_TYPES) ??
        'image/jpeg,image/png,image/gif,image/webp,application/pdf,application/zip'
      )
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      uploadThumbnailWidth: parseInt(
        get(CONFIG_KEYS.UPLOAD_THUMBNAIL_WIDTH) ?? '300',
        10,
      ),
      uploadThumbnailHeight: parseInt(
        get(CONFIG_KEYS.UPLOAD_THUMBNAIL_HEIGHT) ?? '300',
        10,
      ),
    };
  }

  async setMany(data: UpdateSystemSettingDto): Promise<SystemSettingValues> {
    const entries: Array<{ key: string; value: string }> = [];

    if (data.siteName !== undefined)
      entries.push({ key: CONFIG_KEYS.SITE_NAME, value: data.siteName });
    if (data.siteDescription !== undefined)
      entries.push({
        key: CONFIG_KEYS.SITE_DESCRIPTION,
        value: data.siteDescription,
      });
    if (data.logoUrl !== undefined)
      entries.push({
        key: CONFIG_KEYS.SITE_LOGO_URL,
        value: data.logoUrl ?? '',
      });
    if (data.isRegistrationOpen !== undefined)
      entries.push({
        key: CONFIG_KEYS.FEATURE_REGISTRATION_OPEN,
        value: String(data.isRegistrationOpen),
      });
    if (data.isAnnouncementActive !== undefined)
      entries.push({
        key: CONFIG_KEYS.FEATURE_ANNOUNCEMENT_ACTIVE,
        value: String(data.isAnnouncementActive),
      });
    if (data.announcementMessage !== undefined)
      entries.push({
        key: CONFIG_KEYS.FEATURE_ANNOUNCEMENT_MESSAGE,
        value: data.announcementMessage ?? '',
      });
    if (data.announcementType !== undefined)
      entries.push({
        key: CONFIG_KEYS.FEATURE_ANNOUNCEMENT_TYPE,
        value: data.announcementType,
      });
    if (data.contentPurgeRetentionDays !== undefined)
      entries.push({
        key: CONFIG_KEYS.CONTENT_PURGE_RETENTION_DAYS,
        value:
          data.contentPurgeRetentionDays != null
            ? String(data.contentPurgeRetentionDays)
            : '',
      });
    if (data.contentPurgeScheduleHour !== undefined)
      entries.push({
        key: CONFIG_KEYS.CONTENT_PURGE_SCHEDULE_HOUR,
        value: String(data.contentPurgeScheduleHour),
      });
    if (data.reactionMaxPerUserPerPost !== undefined)
      entries.push({
        key: CONFIG_KEYS.REACTION_MAX_PER_USER_PER_POST,
        value: String(data.reactionMaxPerUserPerPost),
      });
    if (data.uploadMaxFileSize !== undefined)
      entries.push({
        key: CONFIG_KEYS.UPLOAD_MAX_FILE_SIZE,
        value: String(data.uploadMaxFileSize),
      });
    if (data.uploadAllowedMimeTypes !== undefined)
      entries.push({
        key: CONFIG_KEYS.UPLOAD_ALLOWED_MIME_TYPES,
        value: data.uploadAllowedMimeTypes.join(','),
      });
    if (data.uploadThumbnailWidth !== undefined)
      entries.push({
        key: CONFIG_KEYS.UPLOAD_THUMBNAIL_WIDTH,
        value: String(data.uploadThumbnailWidth),
      });
    if (data.uploadThumbnailHeight !== undefined)
      entries.push({
        key: CONFIG_KEYS.UPLOAD_THUMBNAIL_HEIGHT,
        value: String(data.uploadThumbnailHeight),
      });

    await this.prisma.$transaction(
      entries.map((e) =>
        this.prisma.systemSetting.upsert({
          where: { key: e.key },
          create: { key: e.key, value: e.value },
          update: { value: e.value },
        }),
      ),
    );

    return this.getAll();
  }

  async resetToDefaults(): Promise<SystemSettingValues> {
    const entries = Object.entries(DEFAULTS).map(([key, value]) => ({
      key,
      value: value ?? '',
    }));

    await this.prisma.$transaction(
      entries.map((e) =>
        this.prisma.systemSetting.upsert({
          where: { key: e.key },
          create: { key: e.key, value: e.value },
          update: { value: e.value },
        }),
      ),
    );

    return this.getAll();
  }
}
