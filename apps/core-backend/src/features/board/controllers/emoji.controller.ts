import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmojiService } from '../services/emoji.service';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { EmojiDto } from '../dto/emoji.dto';

@ApiTags('Emoji')
@Controller({ path: 'emojis', version: '1' })
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
