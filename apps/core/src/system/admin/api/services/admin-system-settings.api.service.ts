import { Injectable } from '@nestjs/common';
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
  constructor(private readonly prisma: PrismaService) {}

  async getSystemSettings() {
    try {
      console.log('AdminSystemSettingsApiService: Getting system settings');
      let settings = await this.prisma.systemSetting.findFirst();

      if (!settings) {
        console.log(
          'AdminSystemSettingsApiService: No settings found, creating defaults',
        );
        settings = await this.createDefaultSettings();
      }

      console.log(
        'AdminSystemSettingsApiService: Returning settings:',
        settings,
      );
      return settings;
    } catch (error) {
      console.error(
        'AdminSystemSettingsApiService: Error getting system settings:',
        error,
      );
      throw error;
    }
  }

  async updateSystemSettings(data: UpdateSystemSettingsDto) {
    try {
      console.log(
        'AdminSystemSettingsApiService: Updating system settings with data:',
        data,
      );

      const existingSettings = await this.prisma.systemSetting.findFirst();
      console.log(
        'AdminSystemSettingsApiService: Existing settings:',
        existingSettings,
      );

      if (existingSettings) {
        console.log(
          'AdminSystemSettingsApiService: Updating existing settings',
        );

        const result = await this.prisma.systemSetting.update({
          where: { id: existingSettings.id },
          data: {
            ...data,
            updatedAt: new Date(),
          },
        });

        console.log(
          'AdminSystemSettingsApiService: Settings updated successfully:',
          result,
        );

        return result;
      } else {
        console.log(
          'AdminSystemSettingsApiService: No existing settings, creating new with data',
        );
        return await this.createDefaultSettings(data);
      }
    } catch (error) {
      console.error(
        'AdminSystemSettingsApiService: Error updating system settings:',
        error,
      );
      throw error;
    }
  }

  private async createDefaultSettings(
    overrides: Partial<UpdateSystemSettingsDto> = {},
  ) {
    try {
      console.log(
        'AdminSystemSettingsApiService: Creating default settings with overrides:',
        overrides,
      );

      const defaultData = {
        siteName: overrides.siteName || 'Weaver2',
        siteDescription: overrides.siteDescription || 'Community Platform',
        logoUrl: overrides.logoUrl || null,
        isRegistrationOpen: overrides.isRegistrationOpen ?? true,
        isAnnouncementActive: overrides.isAnnouncementActive ?? false,
        announcementMessage: overrides.announcementMessage || null,
        announcementType: overrides.announcementType || 'info',
      };

      console.log(
        'AdminSystemSettingsApiService: Creating settings with data:',
        defaultData,
      );

      const result = await this.prisma.systemSetting.create({
        data: defaultData,
      });

      console.log(
        'AdminSystemSettingsApiService: Default settings created successfully:',
        result,
      );

      return result;
    } catch (error) {
      console.error(
        'AdminSystemSettingsApiService: Error creating default settings:',
        error,
      );
      throw error;
    }
  }

  async resetToDefaults() {
    try {
      console.log('AdminSystemSettingsApiService: Resetting to defaults');

      const existingSettings = await this.prisma.systemSetting.findFirst();
      console.log(
        'AdminSystemSettingsApiService: Existing settings for reset:',
        existingSettings,
      );

      if (existingSettings) {
        console.log(
          'AdminSystemSettingsApiService: Updating existing settings to defaults',
        );

        const result = await this.prisma.systemSetting.update({
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

        console.log(
          'AdminSystemSettingsApiService: Settings reset successfully:',
          result,
        );

        return result;
      } else {
        console.log(
          'AdminSystemSettingsApiService: No existing settings, creating defaults',
        );
        return await this.createDefaultSettings();
      }
    } catch (error) {
      console.error(
        'AdminSystemSettingsApiService: Error resetting to defaults:',
        error,
      );
      throw error;
    }
  }
}
