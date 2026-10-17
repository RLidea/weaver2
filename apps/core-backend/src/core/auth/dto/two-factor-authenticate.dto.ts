import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Matches } from 'class-validator';

export class TwoFactorAuthenticateDto {
  @ApiProperty({ description: '로그인 1단계에서 발급받은 pre-auth 토큰' })
  @IsString()
  preAuthToken: string;

  @ApiProperty({ enum: ['totp', 'email'], description: '사용할 2FA 방식' })
  @IsEnum(['totp', 'email'])
  method: 'totp' | 'email';

  @ApiProperty({ description: '6자리 인증 코드', example: '012345' })
  @IsString()
  // otplib 는 형식이 틀린 코드에 던진다(500) — 시도를 잡기 전에 입구에서 거른다
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code: string;
}
