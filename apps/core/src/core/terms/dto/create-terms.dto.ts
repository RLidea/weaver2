import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateTermsDto {
  @ApiProperty({ description: '약관 제목' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: '약관 내용' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: '시행일' })
  @IsDateString()
  effectiveAt: string;
}
