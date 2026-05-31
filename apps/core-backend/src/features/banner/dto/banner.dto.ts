import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Banner, BannerSlot } from '@prisma/client';

export class BannerDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() imageFileId: string;
  @ApiPropertyOptional({ nullable: true }) linkUrl: string | null;
  @ApiProperty({ enum: ['MAIN_TOP', 'MAIN_BOTTOM', 'SIDEBAR', 'POPUP'] })
  slot: BannerSlot;
  @ApiProperty() isActive: boolean;
  @ApiProperty() sortOrder: number;
  @ApiPropertyOptional({ nullable: true }) startsAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) endsAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) createdById: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static from(entity: Banner): BannerDto {
    const dto = new BannerDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.imageFileId = entity.imageFileId;
    dto.linkUrl = entity.linkUrl;
    dto.slot = entity.slot;
    dto.isActive = entity.isActive;
    dto.sortOrder = entity.sortOrder;
    dto.startsAt = entity.startsAt;
    dto.endsAt = entity.endsAt;
    dto.createdById = entity.createdById;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
