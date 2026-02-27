import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TermsAndConditions } from '@prisma/client';
import { PrismaService } from '@weaver2/prisma';
import { CreateTermsDto } from '../dto/create-terms.dto';
import { UpdateTermsDto } from '../dto/update-terms.dto';
import { CreateTermsCommand } from '../repositories/create-terms.command';
import { DeleteTermsCommand } from '../repositories/delete-terms.command';
import { FindLatestTermsAndConditionsQuery } from '../repositories/find-latest-terms-and-conditions.query';
import { FindTermsByIdQuery } from '../repositories/find-terms-by-id.query';
import { UpdateTermsCommand } from '../repositories/update-terms.command';

@Injectable()
export class TermsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestTerms(): Promise<TermsAndConditions[]> {
    return FindLatestTermsAndConditionsQuery(this.prisma);
  }

  async findById(id: string): Promise<TermsAndConditions> {
    const terms = await FindTermsByIdQuery(this.prisma, id);
    if (!terms) throw new NotFoundException('약관을 찾을 수 없습니다.');
    return terms;
  }

  async create(dto: CreateTermsDto): Promise<TermsAndConditions> {
    return CreateTermsCommand(this.prisma, {
      title: dto.title,
      content: dto.content,
      effectiveAt: new Date(dto.effectiveAt),
    });
  }

  async update(id: string, dto: UpdateTermsDto): Promise<TermsAndConditions> {
    await this.findById(id);
    return UpdateTermsCommand(this.prisma, id, {
      title: dto.title,
      content: dto.content,
      effectiveAt: dto.effectiveAt ? new Date(dto.effectiveAt) : undefined,
    });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);

    const agreementCount = await this.prisma.userTermsAgreement.count({
      where: { termsAndConditionsId: id },
    });
    if (agreementCount > 0) {
      throw new ConflictException(
        '동의한 사용자가 있는 약관은 삭제할 수 없습니다.',
      );
    }

    await DeleteTermsCommand(this.prisma, id);
  }
}
