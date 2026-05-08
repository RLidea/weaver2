import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { EmojiDto } from '../dto/emoji.dto';
import { CreateEmojiDto } from '../dto/create-emoji.dto';
import { UpdateEmojiDto } from '../dto/update-emoji.dto';
import {
  FindAllEmojisQuery,
  FindEmojiByIdQuery,
  FindEmojiByCodeQuery,
  CreateEmojiCommand,
  UpdateEmojiCommand,
  DeleteEmojiCommand,
} from '../repositories/emoji.repository';

@Injectable()
export class EmojiService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false): Promise<EmojiDto[]> {
    return FindAllEmojisQuery(this.prisma, { includeInactive }) as Promise<
      EmojiDto[]
    >;
  }

  async findById(id: string): Promise<EmojiDto> {
    const emoji = await FindEmojiByIdQuery(this.prisma, id);
    if (!emoji) throw new NotFoundException(`Emoji with ID '${id}' not found.`);
    return emoji as EmojiDto;
  }

  async create(dto: CreateEmojiDto): Promise<EmojiDto> {
    if (!dto.unicode && !dto.imageUrl) {
      throw new BadRequestException(
        'unicode 또는 imageUrl 중 하나는 필수입니다.',
      );
    }

    const existing = await FindEmojiByCodeQuery(this.prisma, dto.code);
    if (existing) {
      throw new BadRequestException(`이미 사용 중인 코드입니다: '${dto.code}'`);
    }

    return CreateEmojiCommand(this.prisma, {
      code: dto.code,
      name: dto.name,
      unicode: dto.unicode ?? null,
      imageUrl: dto.imageUrl ?? null,
      isActive: dto.isActive ?? true,
    }) as Promise<EmojiDto>;
  }

  async update(id: string, dto: UpdateEmojiDto): Promise<EmojiDto> {
    await this.findById(id);
    return UpdateEmojiCommand(this.prisma, id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.unicode !== undefined && { unicode: dto.unicode }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    }) as Promise<EmojiDto>;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await DeleteEmojiCommand(this.prisma, id);
  }
}
