import { IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SavePushSubscriptionDto {
  @ApiProperty({ description: 'Push endpoint URL' })
  @IsUrl()
  endpoint: string;

  @ApiProperty({ description: 'P256DH key' })
  @IsString()
  p256dh: string;

  @ApiProperty({ description: 'Auth secret' })
  @IsString()
  auth: string;
}

export class DeletePushSubscriptionDto {
  @ApiProperty({ description: 'Push endpoint URL to unsubscribe' })
  @IsUrl()
  endpoint: string;
}
