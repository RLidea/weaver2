import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsEmail,
  IsDateString,
} from 'class-validator';
import { EmailStatus } from '@prisma/client';

export class EmailLogDto {
  @IsUUID()
  id: string;

  @IsEmail()
  to: string;

  @IsEmail()
  from: string;

  @IsString()
  subject: string;

  @IsString()
  htmlContent: string;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsEnum(EmailStatus)
  status: EmailStatus;

  @IsOptional()
  @IsDateString()
  sentAt?: string;

  @IsOptional()
  @IsDateString()
  failedAt?: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;
}
