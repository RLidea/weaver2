import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

interface UpdateSystemSettingsDto {
  siteName?: string;
  siteDescription?: string;
  logoUrl?: string;
  isRegistrationOpen?: boolean;
  isAnnouncementActive?: boolean;
  announcementMessage?: string;
  announcementType?: string;
}

@Injectable()
export class AdminSystemSettingsApiService {
  private readonly logger = new Logger(AdminSystemSettingsApiService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSystemSettings() {
    try {
      let settings = await this.prisma.systemSetting.findFirst();

      if (!settings) {
        this.logger.debug('No settings found, creating defaults');
        settings = await this.createDefaultSettings();
      }

      return settings;
    } catch (error) {
      this.logger.error(
        'Error getting system settings',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async updateSystemSettings(data: UpdateSystemSettingsDto) {
    try {
      const existingSettings = await this.prisma.systemSetting.findFirst();

      if (existingSettings) {
        return await this.prisma.systemSetting.update({
          where: { id: existingSettings.id },
          data: {
            ...data,
            updatedAt: new Date(),
          },
        });
      } else {
        this.logger.debug('No existing settings, creating new with data');
        return await this.createDefaultSettings(data);
      }
    } catch (error) {
      this.logger.error(
        'Error updating system settings',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private async createDefaultSettings(
    overrides: Partial<UpdateSystemSettingsDto> = {},
  ) {
    try {
      const defaultData = {
        siteName: overrides.siteName || 'Weaver2',
        siteDescription: overrides.siteDescription || 'Community Platform',
        logoUrl: overrides.logoUrl || null,
        isRegistrationOpen: overrides.isRegistrationOpen ?? true,
        isAnnouncementActive: overrides.isAnnouncementActive ?? false,
        announcementMessage: overrides.announcementMessage || null,
        announcementType: overrides.announcementType || 'info',
      };

      return await this.prisma.systemSetting.create({ data: defaultData });
    } catch (error) {
      this.logger.error(
        'Error creating default settings',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async resetToDefaults() {
    try {
      const existingSettings = await this.prisma.systemSetting.findFirst();

      if (existingSettings) {
        return await this.prisma.systemSetting.update({
          where: { id: existingSettings.id },
          data: {
            siteName: 'Weaver2',
            siteDescription: 'Community Platform',
            logoUrl: null,
            isRegistrationOpen: true,
            isAnnouncementActive: false,
            announcementMessage: null,
            announcementType: 'info',
            updatedAt: new Date(),
          },
        });
      } else {
        this.logger.debug('No existing settings, creating defaults');
        return await this.createDefaultSettings();
      }
    } catch (error) {
      this.logger.error(
        'Error resetting to defaults',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
