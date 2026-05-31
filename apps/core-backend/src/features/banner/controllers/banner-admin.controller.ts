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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RequirePermission } from '../../../core/permission/decorators/require-permission.decorator';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { BannerService } from '../services/banner.service';
import { BannerDto } from '../dto/banner.dto';
import { CreateBannerDto } from '../dto/create-banner.dto';
import { UpdateBannerDto } from '../dto/update-banner.dto';

@ApiTags('Banner Admin')
@Controller({ path: 'admin/banners', version: '1' })
@UseGuards(JwtAuthGuard)
export class BannerAdminController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  @RequirePermission(PERMISSIONS.BANNER.MANAGE)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '배너 목록 조회 (관리자 전용)' })
  @ApiStandardResponses({ type: BannerDto, isArray: true })
  async findAll(): Promise<BannerDto[]> {
    return this.bannerService.findAll();
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.BANNER.MANAGE)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '배너 단건 조회 (관리자 전용)' })
  @ApiStandardResponses({ type: BannerDto })
  async findOne(@Param('id') id: string): Promise<BannerDto> {
    return this.bannerService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.BANNER.MANAGE)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '배너 생성 (관리자 전용)' })
  @ApiStandardResponses({ type: BannerDto })
  async create(
    @Body() dto: CreateBannerDto,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<BannerDto> {
    return this.bannerService.create(dto, authUser!.id);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.BANNER.MANAGE)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '배너 수정 (관리자 전용)' })
  @ApiStandardResponses({ type: BannerDto })
  async update(@Param('id') id: string, @Body() dto: UpdateBannerDto): Promise<BannerDto> {
    return this.bannerService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(PERMISSIONS.BANNER.MANAGE)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '배너 삭제 (관리자 전용)' })
  @ApiStandardResponses({ status: 204, description: 'Banner deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.bannerService.remove(id);
  }
}
