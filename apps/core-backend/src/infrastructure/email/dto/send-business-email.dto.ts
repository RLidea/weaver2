import {
  IsString,
  IsOptional,
  IsEmail,
  IsUUID,
  IsObject,
} from 'class-validator';

export class SendBusinessEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  subject: string;

  @IsString()
  htmlContent: string;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsEmail()
  from?: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SendTemplateEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  templateName: string;

  @IsObject()
  variables: Record<string, any>;

  @IsOptional()
  @IsEmail()
  from?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
