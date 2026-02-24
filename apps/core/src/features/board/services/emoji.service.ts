import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { EmojiDto } from '../dto/emoji.dto';
import { CreateEmojiDto } from '../dto/create-emoji.dto';
import { UpdateEmojiDto } from '../dto/update-emoji.dto';

@Injectable()
export class EmojiService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false): Promise<EmojiDto[]> {
    return this.prisma.emoji.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { createdAt: 'asc' },
    }) as Promise<EmojiDto[]>;
  }

  async findById(id: string): Promise<EmojiDto> {
    const emoji = await this.prisma.emoji.findUnique({ where: { id } });
    if (!emoji) throw new NotFoundException(`Emoji with ID '${id}' not found.`);
    return emoji as EmojiDto;
  }

  async create(dto: CreateEmojiDto): Promise<EmojiDto> {
    if (!dto.unicode && !dto.imageUrl) {
      throw new BadRequestException(
        'unicode 또는 imageUrl 중 하나는 필수입니다.',
      );
    }

    const existing = await this.prisma.emoji.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(`이미 사용 중인 코드입니다: '${dto.code}'`);
    }

    return this.prisma.emoji.create({
      data: {
        code: dto.code,
        name: dto.name,
        unicode: dto.unicode ?? null,
        imageUrl: dto.imageUrl ?? null,
        isActive: dto.isActive ?? true,
      },
    }) as Promise<EmojiDto>;
  }

  async update(id: string, dto: UpdateEmojiDto): Promise<EmojiDto> {
    await this.findById(id);
    return this.prisma.emoji.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.unicode !== undefined && { unicode: dto.unicode }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    }) as Promise<EmojiDto>;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.emoji.delete({ where: { id } });
  }
}
