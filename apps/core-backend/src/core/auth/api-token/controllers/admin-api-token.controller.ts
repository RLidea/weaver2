import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { RequirePermission } from '../../../permission/decorators/require-permission.decorator';
import { ApiTokenService } from '../api-token.service';
import { ApiTokenDto, IssuedApiTokenDto } from '../dto/api-token.dto';
import { ApiTokensQueryDto } from '../dto/api-tokens-query.dto';
import { CreateApiTokenDto } from '../dto/create-api-token.dto';

@ApiTags('Admin - API Token')
@ApiBearerAuth('ACCESS-TOKEN')
@Controller({ path: 'admin/api-tokens', version: '1' })
@RequirePermission(PERMISSIONS.API_TOKEN.MANAGE)
export class AdminApiTokenController {
  constructor(private readonly apiTokenService: ApiTokenService) {}

  @Get()
  @ApiOperation({
    summary: 'API 토큰 목록 (끊긴 것 포함, 최신 순)',
  })
  @ApiStandardResponses({ type: ApiTokenDto, isArray: true })
  findAll(@Query() query: ApiTokensQueryDto): Promise<ApiTokenDto[]> {
    return this.apiTokenService.list({ userId: query.userId });
  }

  @Post()
  @ApiOperation({
    summary: 'API 토큰 발급',
    description:
      '원문(`token`)은 이 응답에만 실린다. 저장소에는 해시만 남는다.',
  })
  @ApiStandardResponses({ type: IssuedApiTokenDto, status: HttpStatus.CREATED })
  issue(
    @Body() dto: CreateApiTokenDto,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<IssuedApiTokenDto> {
    return this.apiTokenService.issue(
      {
        userId: dto.userId,
        name: dto.name,
        scopes: dto.scopes,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      authUser.id,
    );
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'API 토큰 끊기',
    description:
      '되살릴 수 없다. 이미 끊긴 토큰이면 처음 끊은 시각을 그대로 돌려준다.',
  })
  @ApiStandardResponses({ type: ApiTokenDto })
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<ApiTokenDto> {
    return this.apiTokenService.revoke(id, authUser.id);
  }
}
