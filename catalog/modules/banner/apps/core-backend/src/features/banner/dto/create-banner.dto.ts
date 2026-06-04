import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsDateString,
  Min,
} from 'class-validator';
import { BannerSlot } from '@prisma/client';

export class CreateBannerDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() imageFileId: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() linkUrl?: string;
  @ApiProperty({ enum: BannerSlot }) @IsEnum(BannerSlot) slot: BannerSlot;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endsAt?: string;
}
