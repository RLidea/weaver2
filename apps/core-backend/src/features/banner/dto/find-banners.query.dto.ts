import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BannerSlot } from '@prisma/client';

export class FindBannersQueryDto {
  @ApiPropertyOptional({ enum: BannerSlot })
  @IsOptional()
  @IsEnum(BannerSlot)
  slot?: BannerSlot;
}
