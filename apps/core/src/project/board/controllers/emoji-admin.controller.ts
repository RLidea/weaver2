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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { EmojiService } from '../services/emoji.service';
import { JwtAuthGuard } from '../../../features/auth/guards/jwt-auth.guard';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { EmojiDto } from '../dto/emoji.dto';
import { CreateEmojiDto } from '../dto/create-emoji.dto';
import { UpdateEmojiDto } from '../dto/update-emoji.dto';
import { RequirePermission } from '../../../features/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';

@ApiTags('Admin - Emoji')
@Controller({ path: 'admin/emojis', version: '1' })
@UseGuards(JwtAuthGuard)
export class EmojiAdminController {
  constructor(private readonly emojiService: EmojiService) {}

  @Get()
  @RequirePermission(PERMISSIONS.BOARD.MANAGE)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '이모지 목록 조회 (관리자 전용)' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiStandardResponses({ type: EmojiDto, isArray: true })
  async findAll(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<EmojiDto[]> {
    return this.emojiService.findAll(includeInactive === 'true');
  }

  @Post()
  @RequirePermission(PERMISSIONS.BOARD.MANAGE)
  @ApiBearerAuth('ACCESS-TOKEN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '이모지 생성 (관리자 전용)' })
  @ApiStandardResponses({ type: EmojiDto })
  async create(@Body() dto: CreateEmojiDto): Promise<EmojiDto> {
    return this.emojiService.create(dto);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.BOARD.MANAGE)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '이모지 수정 (관리자 전용)' })
  @ApiStandardResponses({ type: EmojiDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmojiDto,
  ): Promise<EmojiDto> {
    return this.emojiService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.BOARD.MANAGE)
  @ApiBearerAuth('ACCESS-TOKEN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '이모지 삭제 (관리자 전용)' })
  @ApiStandardResponses({
    status: 204,
    description: 'Emoji deleted successfully',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.emojiService.remove(id);
  }
}
