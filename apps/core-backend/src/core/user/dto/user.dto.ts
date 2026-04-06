import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserSettingDto {
  @ApiProperty() isEmailNotificationsEnabled: boolean;
  @ApiProperty() isSmsNotificationsEnabled: boolean;
  @ApiProperty() isPushNotificationsEnabled: boolean;
  @ApiProperty() isMarketingConsentGiven: boolean;
  @ApiProperty() isNewsletterSubscribed: boolean;
  @ApiProperty() prefersDarkMode: boolean;
}

export class UserDto {
  @ApiProperty({
    type: String,
    description: 'Unique user ID',
    example: 'clxgy8o6p00001234567890ab',
  })
  id: string;

  @ApiProperty({
    type: String,
    description: 'Username',
    example: 'testuser',
  })
  username: string;

  @ApiProperty({
    type: String,
    description: 'Display name',
    example: 'Test User',
  })
  displayName: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Email address',
    example: 'user@example.com',
  })
  email: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Profile image URL',
    example: 'https://example.com/profile.jpg',
  })
  profileImageUrl: string | null;

  @ApiPropertyOptional({
    type: [String],
    description: 'Granted permissions (only included in /users/me response)',
    example: ['post:create', 'comment:create'],
  })
  permissions?: string[];

  @ApiPropertyOptional({
    type: UserSettingDto,
    description: 'User settings (only included in /users/me response)',
  })
  userSetting?: UserSettingDto;
}
