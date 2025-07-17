import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '표시 이름' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  displayName?: string;

  @ApiPropertyOptional({ description: '사용자 이름 (로그인 ID)' })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  username?: string;

  @ApiPropertyOptional({ description: '마케팅 정보 수신 동의 여부' })
  @IsOptional()
  @IsBoolean()
  isMarketingConsentGiven?: boolean;

  @ApiPropertyOptional({ description: '뉴스레터 수신 동의 여부' })
  @IsOptional()
  @IsBoolean()
  isNewsletterSubscribed?: boolean;

  @ApiPropertyOptional({ description: '이메일 알림 수신 동의 여부' })
  @IsOptional()
  @IsBoolean()
  isEmailNotificationsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'SMS 알림 수신 동의 여부' })
  @IsOptional()
  @IsBoolean()
  isSmsNotificationsEnabled?: boolean;

  @ApiPropertyOptional({ description: '푸시 알림 수신 동의 여부' })
  @IsOptional()
  @IsBoolean()
  isPushNotificationsEnabled?: boolean;

  @ApiPropertyOptional({ description: '다크 모드 선호 여부' })
  @IsOptional()
  @IsBoolean()
  prefersDarkMode?: boolean;
}
