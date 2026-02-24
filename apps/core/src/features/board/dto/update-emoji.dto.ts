import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateEmojiDto {
  @ApiPropertyOptional({ description: '이모지 표시 이름' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Unicode 문자' })
  @IsOptional()
  @IsString()
  unicode?: string;

  @ApiPropertyOptional({ description: '커스텀 이모지 이미지 URL' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
