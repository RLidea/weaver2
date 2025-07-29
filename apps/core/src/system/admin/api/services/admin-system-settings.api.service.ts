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
        console.log('AdminSystemSettingsApiService: No settings found, creating defaults');
        settings = await this.createDefaultSettings();
      }
      
      console.log('AdminSystemSettingsApiService: Returning settings:', settings);
      return settings;
    } catch (error) {
      console.error('AdminSystemSettingsApiService: Error getting system settings:', error);
      throw error;
    }
  }

  async updateSystemSettings(data: UpdateSystemSettingsDto) {
    const existingSettings = await this.prisma.systemSetting.findFirst();
    
    if (existingSettings) {
      return this.prisma.systemSetting.update({
        where: { id: existingSettings.id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } else {
      return this.createDefaultSettings(data);
    }
  }

  private async createDefaultSettings(overrides: Partial<UpdateSystemSettingsDto> = {}) {
    return this.prisma.systemSetting.create({
      data: {
        siteName: overrides.siteName || 'Weaver2',
        siteDescription: overrides.siteDescription || 'Community Platform',
        logoUrl: overrides.logoUrl || null,
        isRegistrationOpen: overrides.isRegistrationOpen ?? true,
        isAnnouncementActive: overrides.isAnnouncementActive ?? false,
        announcementMessage: overrides.announcementMessage || null,
        announcementType: overrides.announcementType || 'info',
      },
    });
  }

  async resetToDefaults() {
    const existingSettings = await this.prisma.systemSetting.findFirst();
    
    if (existingSettings) {
      return this.prisma.systemSetting.update({
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
      return this.createDefaultSettings();
    }
  }
}