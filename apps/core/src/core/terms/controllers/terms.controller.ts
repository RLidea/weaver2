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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { RequirePermission } from '../../permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { TermsService } from '../services/terms.service';
import { TermsDto } from '../dto/terms.dto';
import { CreateTermsDto } from '../dto/create-terms.dto';
import { UpdateTermsDto } from '../dto/update-terms.dto';

@ApiTags('Terms')
@Controller({ path: 'terms', version: '1' })
@UseGuards(JwtAuthGuard)
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Public()
  @Get('latest')
  @ApiOperation({ summary: '최신 이용약관 조회' })
  @ApiStandardResponses({ type: TermsDto, isArray: true })
  async getLatestTerms(): Promise<TermsDto[]> {
    const terms = await this.termsService.getLatestTerms();
    return terms.map((t) => TermsDto.from(t));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '약관 등록 (관리자 전용)' })
  @ApiStandardResponses({ type: TermsDto })
  @RequirePermission(PERMISSIONS.TERMS.MANAGE)
  async create(@Body() dto: CreateTermsDto): Promise<TermsDto> {
    const terms = await this.termsService.create(dto);
    return TermsDto.from(terms);
  }

  @Patch(':id')
  @ApiOperation({ summary: '약관 수정 (관리자 전용)' })
  @ApiStandardResponses({ type: TermsDto })
  @RequirePermission(PERMISSIONS.TERMS.MANAGE)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTermsDto,
  ): Promise<TermsDto> {
    const terms = await this.termsService.update(id, dto);
    return TermsDto.from(terms);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '약관 삭제 (관리자 전용)' })
  @ApiStandardResponses({
    status: 204,
    description: 'Terms deleted successfully',
  })
  @RequirePermission(PERMISSIONS.TERMS.MANAGE)
  async delete(@Param('id') id: string): Promise<void> {
    return this.termsService.delete(id);
  }
}
