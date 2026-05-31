import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { BannerService } from '../services/banner.service';
import { BannerDto } from '../dto/banner.dto';
import { FindBannersQueryDto } from '../dto/find-banners.query.dto';

@ApiTags('Banner')
@Controller({ path: 'banners', version: '1' })
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  @ApiOperation({ summary: '활성 배너 조회 (슬롯별 필터 가능)' })
  @ApiStandardResponses({ type: BannerDto, isArray: true })
  async findActive(@Query() query: FindBannersQueryDto): Promise<BannerDto[]> {
    return this.bannerService.findActiveBySlot(query.slot);
  }
}
