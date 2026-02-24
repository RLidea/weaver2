import { ApiProperty } from '@nestjs/swagger';
import { EmojiDto } from './emoji.dto';

export class ReactionSummaryDto {
  @ApiProperty({ description: '이모지 정보', type: () => EmojiDto })
  emoji: EmojiDto;

  @ApiProperty({ description: '해당 이모지 리액션 수' })
  count: number;

  @ApiProperty({ description: '현재 사용자가 이 이모지로 반응했는지 여부' })
  reacted: boolean;
}

export class PostReactionsResponseDto {
  @ApiProperty({
    description: '이모지별 리액션 목록',
    type: () => [ReactionSummaryDto],
  })
  reactions: ReactionSummaryDto[];

  @ApiProperty({ description: '총 리액션 수' })
  totalCount: number;
}
