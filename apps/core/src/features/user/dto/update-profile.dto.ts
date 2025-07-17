import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Display name' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Username (for login)' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({
    description: 'Consent to receive marketing information',
  })
  @IsBoolean()
  @IsOptional()
  marketingConsent?: boolean;

  @ApiPropertyOptional({ description: 'Consent to receive newsletter' })
  @IsBoolean()
  @IsOptional()
  newsletterConsent?: boolean;

  @ApiPropertyOptional({
    description: 'Consent to receive email notifications',
  })
  @IsBoolean()
  @IsOptional()
  emailNotification?: boolean;

  @ApiPropertyOptional({ description: 'Consent to receive SMS notifications' })
  @IsBoolean()
  @IsOptional()
  smsNotification?: boolean;

  @ApiPropertyOptional({ description: 'Consent to receive push notifications' })
  @IsBoolean()
  @IsOptional()
  pushNotification?: boolean;

  @ApiPropertyOptional({ description: 'Dark mode preference' })
  @IsBoolean()
  @IsOptional()
  darkMode?: boolean;
}
