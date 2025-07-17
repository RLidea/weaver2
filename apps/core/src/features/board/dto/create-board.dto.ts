import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateBoardDto {
  @ApiProperty({ description: '게시판 이름 (고유해야 함)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: '게시판 설명', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
