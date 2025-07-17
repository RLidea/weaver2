import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';

@ApiTags('User Admin')
@Controller({ path: 'admin/users', version: '1' })
export class UserAdminController {
  @Get('admin-info')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '관리자 정보 조회 (ADMIN만 접근 가능)' })
  @ApiStandardResponses()
  getAdminInfo() {
    return { message: 'Welcome, Admin!' };
  }
}
