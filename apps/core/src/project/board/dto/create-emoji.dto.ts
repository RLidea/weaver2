import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';

export class CreateEmojiDto {
  @ApiProperty({
    description: '이모지 코드 (영문/숫자/언더스코어)',
    example: 'thumbsup',
  })
  @IsString()
  @Matches(/^[a-z0-9_]+$/, {
    message: '코드는 소문자, 숫자, 언더스코어만 허용됩니다.',
  })
  code: string;

  @ApiProperty({ description: '이모지 표시 이름', example: '엄지척' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Unicode 문자 (unicode 또는 imageUrl 중 하나 필수)',
    example: '👍',
  })
  @IsOptional()
  @IsString()
  unicode?: string;

  @ApiPropertyOptional({
    description:
      '커스텀 이모지 이미지 URL (unicode 또는 imageUrl 중 하나 필수)',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: '활성화 여부 (기본값: true)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
