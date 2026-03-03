import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBoardDto {
  @ApiProperty({ description: 'Board name (must be unique)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Board description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
