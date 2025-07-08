import {
  Controller,
  Get,
  Query,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { FindUserService } from './services/find-user.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../decorator/roles.decorator';
import { Role } from '@prisma/client';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';
import { PaginationResponseDto } from '@weaver2/pagination/dto/pagination-response.dto';
import { DeleteAccountService } from './services/delete-account.service';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { UserDto } from './dto/user.dto';

@ApiTags('User')
@Controller({ path: 'users', version: '1' })
export class UserController {
  constructor(
    private readonly findUserService: FindUserService,
    private readonly deleteAccountService: DeleteAccountService,
  ) {}

  @Get()
  @Roles(Role.USER)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '사용자 목록 조회 (페이지네이션)' })
  @ApiStandardResponses({ type: PaginationResponseDto })
  findAll(@Query() query: PaginationRequestDto) {
    return this.findUserService.findUsers(query);
  }

  @Get('me')
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '자신의 정보 조회' })
  @ApiStandardResponses({ type: UserDto })
  async getProfile(@AuthUser() authUser: CommonAuthUserDto): Promise<UserDto> {
    return this.findUserService.findUserById(authUser.id);
  }

  @Get('admin-info')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '관리자 정보 조회 (ADMIN만 접근 가능)' })
  @ApiStandardResponses()
  getAdminInfo() {
    return { message: 'Welcome, Admin!' };
  }

  @Get(':username')
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '사용자 이름으로 사용자 조회' })
  @ApiStandardResponses({ type: UserDto })
  async findUserByUsername(
    @Param('username') username: string,
  ): Promise<UserDto> {
    return this.findUserService.findUserByUsername(username);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '자신의 계정 탈퇴' })
  @ApiStandardResponses({ status: 204, description: '계정 탈퇴 성공' })
  async deleteMyAccount(@AuthUser() authUser: CommonAuthUserDto) {
    await this.deleteAccountService.execute(authUser.id);
  }
}
