import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';
import { OffsetResponseDto } from '@weaver2/pagination';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { UserDto } from '../dto/user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { FindUserService } from '../services/find-user.service';
import { UpdateProfileService } from '../services/update-profile.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../permission/guards/permission.guard';
import { RequirePermission } from '../../permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';

@ApiTags('User Query')
@Controller({ path: 'users', version: '1' })
export class UserQueryController {
  constructor(
    private readonly findUserService: FindUserService,
    private readonly updateProfileService: UpdateProfileService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(PERMISSIONS.USER.READ)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '사용자 목록 조회 (관리자 전용)' })
  @ApiStandardResponses({ type: OffsetResponseDto })
  findAll(@Query() query: PaginationRequestDto) {
    return this.findUserService.findUsers(query);
  }

  @Get(':username')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '사용자명으로 사용자 조회 (인증 필수)' })
  @ApiStandardResponses({ type: UserDto })
  async findUserByUsername(
    @Param('username') username: string,
  ): Promise<UserDto> {
    return this.findUserService.findUserByUsername(username);
  }

  @Post(':userId/update-profile')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(PERMISSIONS.USER.UPDATE_ALL)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: 'Admin이 특정 사용자 프로필 수정 (관리자 전용)' })
  @ApiStandardResponses()
  async updateUserProfile(
    @Param('userId') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<void> {
    return this.updateProfileService.updateProfile(userId, updateProfileDto);
  }
}
