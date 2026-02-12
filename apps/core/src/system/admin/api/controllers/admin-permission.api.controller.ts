import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../../features/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { AdminPermissionApiService } from '../services/admin-permission.api.service';
import {
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
} from '../dto/permission-group.dto';

@ApiTags('Admin Permission')
@Controller({ path: 'admin/permissions', version: '1' })
export class AdminPermissionApiController {
  constructor(
    private readonly adminPermissionApiService: AdminPermissionApiService,
  ) {}

  // ============ Permission Group CRUD ============

  @Get('groups')
  @ApiOperation({ summary: '전체 권한 그룹 목록 조회' })
  @RequirePermission(PERMISSIONS.PERMISSION_GROUP.READ)
  async findAllGroups() {
    return this.adminPermissionApiService.findAllGroups();
  }

  @Get('groups/:id')
  @ApiOperation({ summary: '권한 그룹 상세 조회 (권한 목록 포함)' })
  @RequirePermission(PERMISSIONS.PERMISSION_GROUP.READ)
  async findGroupById(@Param('id') id: string) {
    return this.adminPermissionApiService.findGroupById(id);
  }

  @Post('groups')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '권한 그룹 생성' })
  @RequirePermission(PERMISSIONS.PERMISSION_GROUP.CREATE)
  async createGroup(@Body() dto: CreatePermissionGroupDto) {
    return this.adminPermissionApiService.createGroup(dto);
  }

  @Patch('groups/:id')
  @ApiOperation({ summary: '권한 그룹 수정 (이름, 설명)' })
  @RequirePermission(PERMISSIONS.PERMISSION_GROUP.UPDATE)
  async updateGroup(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionGroupDto,
  ) {
    return this.adminPermissionApiService.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  @ApiOperation({ summary: '권한 그룹 삭제 (시스템 그룹 불가)' })
  @RequirePermission(PERMISSIONS.PERMISSION_GROUP.DELETE)
  async deleteGroup(@Param('id') id: string) {
    return this.adminPermissionApiService.deleteGroup(id);
  }
}
