import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TwoFactorSendEmailDto {
  @ApiProperty({ description: '로그인 1단계에서 발급받은 pre-auth 토큰' })
  @IsString()
  preAuthToken: string;
}
