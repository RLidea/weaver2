import { ApiProperty } from '@nestjs/swagger';

export class AuthProvidersResponseDto {
  @ApiProperty({ description: '이메일·비밀번호 로그인 (항상 켜짐)' })
  password: boolean;

  @ApiProperty({ description: 'Google OAuth 사용 가능 여부' })
  google: boolean;

  @ApiProperty({ description: '카카오 OAuth 사용 가능 여부' })
  kakao: boolean;

  @ApiProperty({ description: '네이버 OAuth 사용 가능 여부' })
  naver: boolean;

  @ApiProperty({
    description:
      'Apple OAuth 사용 가능 여부 (APPLE_OAUTH_ENABLED=true 일 때만)',
  })
  apple: boolean;
}
