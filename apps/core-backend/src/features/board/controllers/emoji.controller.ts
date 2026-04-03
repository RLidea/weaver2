import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmojiService } from '../services/emoji.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { EmojiDto } from '../dto/emoji.dto';

@ApiTags('Emoji')
@Controller({ path: 'emojis', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('ACCESS-TOKEN')
export class EmojiController {
  constructor(private readonly emojiService: EmojiService) {}

  @Get()
  @ApiOperation({ summary: '활성 이모지 목록 조회' })
  @ApiStandardResponses({ type: EmojiDto, isArray: true })
  async findAll(): Promise<EmojiDto[]> {
    return this.emojiService.findAll();
  }
}
