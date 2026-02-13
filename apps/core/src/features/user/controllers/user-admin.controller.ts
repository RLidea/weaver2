import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';

@ApiTags('User Admin')
@Controller({ path: 'admin/users', version: '1' })
export class UserAdminController {
  @Get('admin-info')
  @RequirePermission(PERMISSIONS.USER.READ)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '관리자 정보 조회 (관리자 전용)' })
  @ApiStandardResponses()
  getAdminInfo() {
    return { message: 'Welcome, Admin!' };
  }
}
