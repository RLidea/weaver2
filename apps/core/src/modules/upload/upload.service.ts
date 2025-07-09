import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

@Injectable()
export class UploadService {
  constructor(private readonly prisma: PrismaService) {}
}
