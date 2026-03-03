import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
  IsDateString,
} from 'class-validator';

export class EmailTemplateDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsString()
  subject: string;

  @IsString()
  htmlContent: string;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsArray()
  variables?: string[];

  @IsBoolean()
  isActive: boolean;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;
}

export class CreateEmailTemplateDto {
  @IsString()
  name: string;

  @IsString()
  subject: string;

  @IsString()
  htmlContent: string;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsArray()
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsArray()
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
