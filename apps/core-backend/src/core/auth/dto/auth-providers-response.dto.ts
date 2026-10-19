import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthProvidersResponseDto {
  @ApiProperty({
    description:
      'SSO(OIDC 손님) 모드. true 면 로그인은 `/v1/auth/oidc/start` 하나뿐이고 로컬 수단은 모두 false',
  })
  sso: boolean;

  @ApiProperty({
    description: '이메일·비밀번호 로그인 (AUTH_MODE=local 이면 켜짐)',
  })
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

  @ApiPropertyOptional({
    description:
      '계정 서버의 계정 화면 주소(ACCOUNTS_OIDC_ACCOUNT_URL). sso 이고 설정했을 때만 실린다',
  })
  accountUrl?: string;
}
