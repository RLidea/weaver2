import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';
import { PaginationResponseDto } from '@weaver2/pagination/dto/pagination-response.dto';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { UserDto } from '../dto/user.dto';
import { FindUserService } from '../services/find-user.service';
import { Public } from '@weaver2/common/decorator/public.decorator';

@ApiTags('User Query')
@Controller({ path: 'users', version: '1' })
export class UserQueryController {
  constructor(private readonly findUserService: FindUserService) {}

  @Get()
  @Public()
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '사용자 목록 조회 (Admin/Developer only)' })
  @ApiStandardResponses({ type: PaginationResponseDto })
  findAll(@Query() query: PaginationRequestDto) {
    return this.findUserService.findUsers(query);
  }

  @Public()
  @Get(':username')
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: 'Find user by username' })
  @ApiStandardResponses({ type: UserDto })
  async findUserByUsername(
    @Param('username') username: string,
  ): Promise<UserDto> {
    return this.findUserService.findUserByUsername(username);
  }
}
