import { IsNumber, IsString, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';

export class FindUsersDto {
  @Type(() => Number)
  @IsNumber()
  page: number;

  @Type(() => Number)
  @IsNumber()
  limit: number;

  @IsOptional()
  @IsString()
  role?: Role;
}
