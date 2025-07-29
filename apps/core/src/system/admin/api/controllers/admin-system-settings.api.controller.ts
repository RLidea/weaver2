import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AdminSystemSettingsApiService } from '../services/admin-system-settings.api.service';

interface UpdateSystemSettingsDto {
  siteName?: string;
  siteDescription?: string;
  logoUrl?: string;
  isRegistrationOpen?: boolean;
  isAnnouncementActive?: boolean;
  announcementMessage?: string;
  announcementType?: string;
}

@Controller({ path: 'admin/system-settings', version: '1' })
@Roles(Role.ADMIN, Role.DEVELOPER)
export class AdminSystemSettingsApiController {
  constructor(
    private readonly adminSystemSettingsApiService: AdminSystemSettingsApiService,
  ) {}

  @Get()
  async getSystemSettings() {
    try {
      console.log('AdminSystemSettingsApiController: GET request received');
      const settings = await this.adminSystemSettingsApiService.getSystemSettings();
      console.log('AdminSystemSettingsApiController: Settings retrieved successfully');
      return settings;
    } catch (error) {
      console.error('AdminSystemSettingsApiController: Error getting settings:', error);
      throw error;
    }
  }

  @Put()
  async updateSystemSettings(@Body() updateDto: UpdateSystemSettingsDto) {
    return this.adminSystemSettingsApiService.updateSystemSettings(updateDto);
  }

  @Post('reset')
  async resetToDefaults() {
    return this.adminSystemSettingsApiService.resetToDefaults();
  }
}