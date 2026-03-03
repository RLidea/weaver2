import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../permission/guards/permission.guard';
import { RequirePermission } from '../../permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';
import { UserAdminService } from '../services/user-admin.service';
import { AdminUserDto } from '../dto/admin-user.dto';
import { AdminUsersQueryDto } from '../dto/admin-users-query.dto';
import { AdminUpdateUserDto } from '../dto/admin-update-user.dto';
import { SuspendUserDto } from '../dto/suspend-user.dto';
import { OffsetResponseDto } from '@weaver2/pagination';

@ApiTags('User Admin')
@Controller({ path: 'admin/users', version: '1' })
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('ACCESS-TOKEN')
export class UserAdminController {
  constructor(private readonly userAdminService: UserAdminService) {}

  @Get()
  @RequirePermission(PERMISSIONS.USER.READ)
  @ApiOperation({ summary: '사용자 목록 조회 (관리자 전용)' })
  @ApiStandardResponses({ type: OffsetResponseDto })
  findAll(
    @Query() query: AdminUsersQueryDto,
  ): Promise<OffsetResponseDto<AdminUserDto>> {
    return this.userAdminService.findUsers(query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.USER.READ)
  @ApiOperation({ summary: '사용자 상세 조회 (관리자 전용)' })
  @ApiStandardResponses({ type: AdminUserDto })
  findById(@Param('id') id: string): Promise<AdminUserDto> {
    return this.userAdminService.findUserById(id);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.USER.UPDATE_ALL)
  @ApiOperation({ summary: '사용자 정보 수정 (관리자 전용)' })
  @ApiStandardResponses({ type: AdminUserDto })
  updateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ): Promise<AdminUserDto> {
    return this.userAdminService.updateUser(id, dto);
  }

  @Patch(':id/suspend')
  @RequirePermission(PERMISSIONS.USER.SUSPEND)
  @ApiOperation({ summary: '사용자 정지 (관리자 전용)' })
  @ApiStandardResponses({ type: AdminUserDto })
  suspendUser(
    @AuthUser() authUser: CommonAuthUserDto,
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
  ): Promise<AdminUserDto> {
    return this.userAdminService.suspendUser(authUser.id, id, dto);
  }

  @Patch(':id/unsuspend')
  @RequirePermission(PERMISSIONS.USER.SUSPEND)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '사용자 정지 해제 (관리자 전용)' })
  @ApiStandardResponses()
  unsuspendUser(@Param('id') id: string): Promise<void> {
    return this.userAdminService.unsuspendUser(id);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.USER.DELETE_ALL)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '사용자 삭제 (관리자 전용)' })
  @ApiStandardResponses()
  deleteUser(
    @AuthUser() authUser: CommonAuthUserDto,
    @Param('id') id: string,
  ): Promise<void> {
    return this.userAdminService.deleteUser(authUser.id, id);
  }
}
