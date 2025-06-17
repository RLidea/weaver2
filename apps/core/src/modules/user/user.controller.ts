import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import {
  ApiBearerAuth,
  ApiResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../decorator/roles.decorator';
import { Role } from '@prisma/client';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';
import { PaginationResponseDto } from '@weaver2/pagination/dto/pagination-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('User')
@Controller({ path: 'users', version: '1' })
export class UserController {
  constructor(private readonly usersService: UserService) {}

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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '자신의 정보 조회' })
  getProfile() {
    return;
  }
}
