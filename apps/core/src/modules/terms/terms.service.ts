import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { FindLatestTermsAndConditionsQuery } from './repositories/find-latest-terms-and-conditions.query';

@Injectable()
export class TermsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestTerms(): Promise<any[]> {
    return FindLatestTermsAndConditionsQuery(this.prisma);
  }
}
