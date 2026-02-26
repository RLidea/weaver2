import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TwoFactorConfirmDto {
  @ApiProperty({ description: '6자리 인증 코드' })
  @IsString()
  code: string;
}
