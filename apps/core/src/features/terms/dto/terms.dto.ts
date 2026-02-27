import { ApiProperty } from '@nestjs/swagger';
import { TermsAndConditions } from '@prisma/client';

export class TermsDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  version: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  effectiveAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(terms: TermsAndConditions): TermsDto {
    const dto = new TermsDto();
    dto.id = terms.id;
    dto.version = terms.version;
    dto.title = terms.title;
    dto.content = terms.content;
    dto.effectiveAt = terms.effectiveAt;
    dto.createdAt = terms.createdAt;
    dto.updatedAt = terms.updatedAt;
    return dto;
  }
}
