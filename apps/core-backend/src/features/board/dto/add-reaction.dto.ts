import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AddReactionDto {
  @ApiProperty({ description: '리액션할 이모지 ID' })
  @IsString()
  emojiId: string;
}
