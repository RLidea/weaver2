import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateBoardDto {
  @ApiPropertyOptional({ description: 'Board name (must be unique)' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Board description' })
  @IsString()
  @IsOptional()
  description?: string;
}
