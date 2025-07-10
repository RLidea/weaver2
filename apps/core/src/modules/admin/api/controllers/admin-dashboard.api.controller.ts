import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../../../decorator/roles.decorator';
import { Role } from '@prisma/client';
import { AdminDashboardApiService } from '../services/admin-dashboard.api.service';

@Controller('admin/dashboard')
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
