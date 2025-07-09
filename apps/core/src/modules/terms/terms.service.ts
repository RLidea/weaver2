import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

@Injectable()
export class TermsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestTerms(): Promise<any[]> {
    const now = new Date();
    // Fetch the latest version for each unique title
    const latestTerms = await this.prisma.termsAndConditions.findMany({
      distinct: ['title'],
      orderBy: [{ title: 'asc' }, { version: 'desc' }],
      where: {
        effectiveAt: { lte: now },
      },
    });

    return latestTerms;
  }
}
