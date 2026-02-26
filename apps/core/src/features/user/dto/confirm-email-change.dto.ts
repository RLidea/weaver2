import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmEmailChangeDto {
  @ApiProperty({ example: '123456', description: '6자리 인증 코드' })
  @IsString()
  @Length(6, 6)
  code: string;
}
