import { ApiProperty } from '@nestjs/swagger';

export class ApiTokenOwnerDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'Display name' })
  displayName: string;
}

/** 목록 · 끊기 응답의 한 줄 — 원문도 해시도 싣지 않는다 */
export class ApiTokenDto {
  @ApiProperty({ description: 'API token ID' })
  id: string;

  @ApiProperty({ description: '알아보기 위한 이름' })
  name: string;

  @ApiProperty({ description: '원문의 앞부분 (wvt_xxxxxxxxxxxx)' })
  prefix: string;

  @ApiProperty({ description: '이 토큰이 닿는 범위', type: [String] })
  scopes: string[];

  @ApiProperty({
    description: '마지막으로 인증에 성공한 시각',
    type: Date,
    nullable: true,
  })
  lastUsedAt: Date | null;

  @ApiProperty({
    description: '만료 시각 (없으면 null)',
    type: Date,
    nullable: true,
  })
  expiresAt: Date | null;

  @ApiProperty({
    description: '끊은 시각 (살아 있으면 null)',
    type: Date,
    nullable: true,
  })
  revokedAt: Date | null;

  @ApiProperty({ description: '발급 시각' })
  createdAt: Date;

  @ApiProperty({ description: '토큰의 주인', type: ApiTokenOwnerDto })
  user: ApiTokenOwnerDto;
}

/** 발급 응답 — 원문은 여기에만, 한 번 실린다 */
export class IssuedApiTokenDto {
  @ApiProperty({
    description: '원문. 다시 볼 수 없다 — `Authorization: Bearer <token>`',
  })
  token: string;

  @ApiProperty({ type: ApiTokenDto })
  apiToken: ApiTokenDto;
}
