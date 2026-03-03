import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTermsDto {
  @ApiPropertyOptional({ description: '약관 제목' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ description: '약관 내용' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @ApiPropertyOptional({ description: '시행일' })
  @IsOptional()
  @IsDateString()
  effectiveAt?: string;
}
