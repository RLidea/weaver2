import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export class TwoFactorAuthenticateDto {
  @ApiProperty({ description: '로그인 1단계에서 발급받은 pre-auth 토큰' })
  @IsString()
  preAuthToken: string;

  @ApiProperty({ enum: ['totp', 'email'], description: '사용할 2FA 방식' })
  @IsEnum(['totp', 'email'])
  method: 'totp' | 'email';

  @ApiProperty({ description: '6자리 인증 코드' })
  @IsString()
  code: string;
}
