import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class TrackPageViewDto {
  @ApiProperty({
    description: '방문한 페이지의 URL 경로',
    example: '/products/123',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  pageUrl: string;

  @ApiPropertyOptional({
    description: '사용자 ID (로그인한 사용자의 경우만)',
    example: 'user-uuid-123',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: '방문자의 IP 주소 (자동으로 수집되지만 명시적으로 전달 가능)',
    example: '192.168.1.100',
    maxLength: 45,
  })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  ipAddress?: string;

  @ApiPropertyOptional({
    description: '유입 경로 (이전 페이지 URL)',
    example: 'https://google.com/search?q=example',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiPropertyOptional({
    description:
      '사용자 브라우저 정보 (자동으로 수집되지만 명시적으로 전달 가능)',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class TrackPageViewResponseDto {
  @ApiProperty({
    description: '페이지뷰 트래킹 성공 여부',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '응답 메시지',
    example: 'Page view tracked successfully',
  })
  message: string;
}
