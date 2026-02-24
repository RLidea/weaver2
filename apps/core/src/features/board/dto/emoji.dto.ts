import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EmojiDto {
  @ApiProperty({ description: '이모지 ID' })
  id: string;

  @ApiProperty({ description: '이모지 코드 (고유 식별자, e.g. "thumbsup")' })
  code: string;

  @ApiProperty({ description: '이모지 표시 이름' })
  name: string;

  @ApiPropertyOptional({ description: 'Unicode 문자 (커스텀 이모지면 null)' })
  unicode: string | null;

  @ApiPropertyOptional({
    description: '커스텀 이모지 이미지 URL (Unicode면 null)',
  })
  imageUrl: string | null;

  @ApiProperty({ description: '활성화 여부' })
  isActive: boolean;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;
}
