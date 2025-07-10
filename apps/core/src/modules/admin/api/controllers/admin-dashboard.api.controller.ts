import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../../../decorator/roles.decorator';
import { Role } from '@prisma/client';
import { AdminDashboardApiService } from '../services/admin-dashboard.api.service';

@Controller({ path: 'admin/dashboard', version: '1' })
@Roles(Role.ADMIN, Role.DEVELOPER)
export class AdminDashboardApiController {
  constructor(
    private readonly adminDashboardApiService: AdminDashboardApiService,
  ) {}

  @Get('summary')
  async getSummary() {
    return this.adminDashboardApiService.getSummary();
  }
}
