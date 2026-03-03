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
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../../core/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { AdminPermissionApiService } from '../services/admin-permission.api.service';
import {
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
  SetGroupPermissionsDto,
  RemoveGroupPermissionsDto,
  AssignUsersToGroupDto,
} from '../dto/permission-group.dto';
import { SetResourcePermissionsDto } from '../dto/resource-permission.dto';

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

  // ============ Group Permission Management ============

  @Put('groups/:id/permissions')
  @ApiOperation({ summary: '그룹 권한 전체 교체' })
  @RequirePermission(PERMISSIONS.PERMISSION_GROUP.UPDATE)
  async setGroupPermissions(
    @Param('id') id: string,
    @Body() dto: SetGroupPermissionsDto,
  ) {
    return this.adminPermissionApiService.setGroupPermissions(id, dto);
  }

  @Delete('groups/:id/permissions')
  @ApiOperation({ summary: '그룹에서 특정 권한 제거' })
  @RequirePermission(PERMISSIONS.PERMISSION_GROUP.UPDATE)
  async removeGroupPermissions(
    @Param('id') id: string,
    @Body() dto: RemoveGroupPermissionsDto,
  ) {
    return this.adminPermissionApiService.removeGroupPermissions(id, dto);
  }

  // ============ User-Group Assignment ============

  @Get('groups/:id/users')
  @ApiOperation({ summary: '그룹에 할당된 사용자 목록 조회' })
  @RequirePermission(PERMISSIONS.PERMISSION_GROUP.READ)
  async findGroupUsers(@Param('id') id: string) {
    return this.adminPermissionApiService.findGroupUsers(id);
  }

  @Post('groups/:id/users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '사용자를 그룹에 할당' })
  @RequirePermission(PERMISSIONS.PERMISSION_GROUP.ASSIGN_USER)
  async assignUsersToGroup(
    @Param('id') id: string,
    @Body() dto: AssignUsersToGroupDto,
  ) {
    return this.adminPermissionApiService.assignUsersToGroup(id, dto);
  }

  @Delete('groups/:id/users/:userId')
  @ApiOperation({ summary: '사용자를 그룹에서 해제' })
  @RequirePermission(PERMISSIONS.PERMISSION_GROUP.ASSIGN_USER)
  async removeUserFromGroup(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.adminPermissionApiService.removeUserFromGroup(id, userId);
  }

  // ============ Resource Permission Management ============

  @Get('resource-permissions')
  @ApiOperation({ summary: '리소스 권한 규칙 목록 조회' })
  @RequirePermission(PERMISSIONS.BOARD.MANAGE)
  async findAllResourcePermissions(
    @Query('resourceType') resourceType?: string,
  ) {
    return this.adminPermissionApiService.findAllResourcePermissions(
      resourceType,
    );
  }

  @Get('resource-permissions/:resourceType/:resourceId')
  @ApiOperation({ summary: '특정 리소스의 권한 규칙 조회' })
  @RequirePermission(PERMISSIONS.BOARD.MANAGE)
  async findResourcePermissions(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.adminPermissionApiService.findResourcePermissions(
      resourceType,
      resourceId,
    );
  }

  @Put('resource-permissions/:resourceType/:resourceId')
  @ApiOperation({ summary: '리소스 권한 규칙 설정 (전체 교체)' })
  @RequirePermission(PERMISSIONS.BOARD.MANAGE)
  async setResourcePermissions(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Body() dto: SetResourcePermissionsDto,
  ) {
    return this.adminPermissionApiService.setResourcePermissions(
      resourceType,
      resourceId,
      dto,
    );
  }

  @Delete('resource-permissions/:resourceType/:resourceId/:action')
  @ApiOperation({ summary: '특정 리소스의 특정 액션 규칙 삭제' })
  @RequirePermission(PERMISSIONS.BOARD.MANAGE)
  async deleteResourcePermission(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Param('action') action: string,
  ) {
    return this.adminPermissionApiService.deleteResourcePermission(
      resourceType,
      resourceId,
      action,
    );
  }
}
