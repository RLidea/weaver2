import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../features/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../features/auth/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AdminSecurityApiService } from '../services/admin-security.api.service';

@Controller('api/admin/security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DEVELOPER)
export class AdminSecurityApiController {
  constructor(private readonly adminSecurityService: AdminSecurityApiService) {}

  @Get('system-status')
  async getSystemStatus() {
    return await this.adminSecurityService.getSystemStatus();
  }


  @Get('security-overview')
  async getSecurityOverview() {
    return await this.adminSecurityService.getSecurityOverview();
  }
}