import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import type { BannerSlot } from '@prisma/client';
import { BannerDto } from '../dto/banner.dto';
import { CreateBannerDto } from '../dto/create-banner.dto';
import { UpdateBannerDto } from '../dto/update-banner.dto';
import { CreateBannerCommand } from '../repositories/create-banner.command';
import { UpdateBannerCommand } from '../repositories/update-banner.command';
import { SoftDeleteBannerCommand } from '../repositories/soft-delete-banner.command';
import { FindBannerByIdQuery } from '../repositories/find-banner-by-id.query';
import { FindAllBannersQuery } from '../repositories/find-all-banners.query';
import { FindActiveBannersBySlotQuery } from '../repositories/find-active-banners-by-slot.query';

@Injectable()
export class BannerService {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveBySlot(slot?: BannerSlot): Promise<BannerDto[]> {
    const rows = await FindActiveBannersBySlotQuery(this.prisma, slot, new Date());
    return rows.map(BannerDto.from);
  }

  async findAll(): Promise<BannerDto[]> {
    const rows = await FindAllBannersQuery(this.prisma);
    return rows.map(BannerDto.from);
  }

  async findOne(id: string): Promise<BannerDto> {
    const row = await FindBannerByIdQuery(this.prisma, id);
    if (!row) throw new NotFoundException('Banner not found');
    return BannerDto.from(row);
  }

  async create(dto: CreateBannerDto, createdById: string): Promise<BannerDto> {
    const row = await CreateBannerCommand(this.prisma, {
      title: dto.title,
      imageFileId: dto.imageFileId,
      linkUrl: dto.linkUrl ?? null,
      slot: dto.slot,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      createdById,
    });
    return BannerDto.from(row);
  }

  async update(id: string, dto: UpdateBannerDto): Promise<BannerDto> {
    await this.findOne(id); // 존재 확인 (404)
    const row = await UpdateBannerCommand(this.prisma, id, {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.imageFileId !== undefined ? { imageFileId: dto.imageFileId } : {}),
      ...(dto.linkUrl !== undefined ? { linkUrl: dto.linkUrl } : {}),
      ...(dto.slot !== undefined ? { slot: dto.slot } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.startsAt !== undefined ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null } : {}),
      ...(dto.endsAt !== undefined ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null } : {}),
    });
    return BannerDto.from(row);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // 존재 확인 (404)
    await SoftDeleteBannerCommand(this.prisma, id);
  }
}
