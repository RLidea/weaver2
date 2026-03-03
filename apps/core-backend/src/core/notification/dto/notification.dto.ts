import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class NotificationDto {
  @ApiProperty({ description: '알림 ID' })
  id: string;

  @ApiProperty({ description: '수신자 유저 ID' })
  userId: string;

  @ApiProperty({ enum: NotificationType, description: '알림 타입' })
  type: NotificationType;

  @ApiProperty({ description: '알림 제목' })
  title: string;

  @ApiProperty({ description: '알림 내용' })
  body: string;

  @ApiPropertyOptional({ description: '관련 링크' })
  link: string | null;

  @ApiProperty({ description: '읽음 여부' })
  isRead: boolean;

  @ApiProperty({ description: '생성 시각' })
  createdAt: Date;
}
