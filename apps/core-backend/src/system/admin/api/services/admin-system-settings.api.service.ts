import { Injectable } from '@nestjs/common';
import {
  SystemSettingService,
  UpdateSystemSettingDto,
} from '../../../../infrastructure/config/system-setting.service';

@Injectable()
export class AdminSystemSettingsApiService {
  constructor(private readonly systemSettingService: SystemSettingService) {}

  async getSystemSettings() {
    return this.systemSettingService.getAll();
  }

  async updateSystemSettings(data: UpdateSystemSettingDto) {
    return this.systemSettingService.setMany(data);
  }

  async resetToDefaults() {
    return this.systemSettingService.resetToDefaults();
  }
}
