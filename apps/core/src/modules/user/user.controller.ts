import {
  Controller,
  Get,
  Query,
  Delete,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  ApiBearerAuth,
  ApiResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../decorator/roles.decorator';
import { Role, User } from '@prisma/client';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';
import { PaginationResponseDto } from '@weaver2/pagination/dto/pagination-response.dto';
import { DeleteAccountService } from './services/delete-account.service';
import { Request } from 'express';

@ApiTags('User')
@Controller({ path: 'users', version: '1' })
export class UserController {
  constructor(
    private readonly usersService: UserService,
    private readonly deleteAccountService: DeleteAccountService,
  ) {}

  @Get()
  @Roles(Role.USER)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '사용자 목록 조회 (페이지네이션)' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: PaginationResponseDto,
  })
  findAll(@Query() query: PaginationRequestDto) {
    return this.usersService.findUsers(query);
  }

  @Get('me')
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '자신의 정보 조회' })
  getProfile(@Req() req: Request) {
    return req.user;
  }

  @Get('admin-info')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '관리자 정보 조회 (ADMIN만 접근 가능)' })
  @ApiResponse({ status: 200, description: '관리자 정보 반환' })
  getAdminInfo() {
    return { message: 'Welcome, Admin!' };
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '자신의 계정 탈퇴' })
  @ApiResponse({ status: 204, description: '계정 탈퇴 성공' })
  @ApiResponse({ status: 404, description: '사용자 인증 기록을 찾을 수 없음' })
  async deleteMyAccount(@Req() req: Request) {
    const user = req.user as User;
    await this.deleteAccountService.execute(user.id);
  }
}
