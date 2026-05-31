import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../../core/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { AdminModulesApiService } from '../services/admin-modules.api.service';

@ApiTags('Admin Modules')
@Controller({ path: 'admin/modules', version: '1' })
@RequirePermission(PERMISSIONS.SUPER)
export class AdminModulesApiController {
  constructor(
    private readonly adminModulesApiService: AdminModulesApiService,
  ) {}

  @Get()
  @ApiOperation({ summary: '모듈 의존성 그래프 조회' })
  getModuleGraph() {
    return this.adminModulesApiService.getModuleGraph();
  }
}
