import { Injectable } from '@nestjs/common';
import { TermsAndConditions } from '@prisma/client';
import { PrismaService } from '@weaver2/prisma';
import { FindLatestTermsAndConditionsQuery } from '../repositories/find-latest-terms-and-conditions.query';

@Injectable()
export class TermsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestTerms(): Promise<TermsAndConditions[]> {
    return FindLatestTermsAndConditionsQuery(this.prisma);
  }
}
