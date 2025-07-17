import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateBoardDto {
  @ApiPropertyOptional({ description: '게시판 이름 (고유해야 함)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: '게시판 설명' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
