import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../../features/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
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

@ApiTags('Admin System Settings')
@Controller({ path: 'admin/system-settings', version: '1' })
@RequirePermission(PERMISSIONS.ADMIN.SYSTEM_SETTINGS)
export class AdminSystemSettingsApiController {
  constructor(
    private readonly adminSystemSettingsApiService: AdminSystemSettingsApiService,
  ) {}

  @Get()
  @ApiOperation({ summary: '시스템 설정 전체 조회' })
  async getSystemSettings() {
    try {
      console.log('AdminSystemSettingsApiController: GET request received');
      const settings =
        await this.adminSystemSettingsApiService.getSystemSettings();
      console.log(
        'AdminSystemSettingsApiController: Settings retrieved successfully',
      );
      return settings;
    } catch (error) {
      console.error(
        'AdminSystemSettingsApiController: Error getting settings:',
        error,
      );
      throw error;
    }
  }

  @Put()
  @ApiOperation({ summary: '시스템 설정 수정' })
  async updateSystemSettings(@Body() updateDto: UpdateSystemSettingsDto) {
    return this.adminSystemSettingsApiService.updateSystemSettings(updateDto);
  }

  @Post('reset')
  @ApiOperation({ summary: '시스템 설정 기본값으로 초기화' })
  async resetToDefaults() {
    return this.adminSystemSettingsApiService.resetToDefaults();
  }
}
