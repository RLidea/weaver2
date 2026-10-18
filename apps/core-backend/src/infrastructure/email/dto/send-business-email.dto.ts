import {
  IsString,
  IsOptional,
  IsEmail,
  IsUUID,
  IsObject,
  IsBoolean,
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

  /**
   * 본문에 살아 있는 비밀(재설정·인증 링크, 2FA·이메일 변경 코드)이 있다. 발송 기록에 본문과
   * 변수를 남기지 않고, 재발송도 하지 않는다(비밀은 새로 받게 한다).
   */
  @IsOptional()
  @IsBoolean()
  sensitive?: boolean;
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

  /**
   * 본문에 살아 있는 비밀(재설정·인증 링크, 2FA·이메일 변경 코드)이 있다. 발송 기록에 본문과
   * 변수를 남기지 않고, 재발송도 하지 않는다(비밀은 새로 받게 한다).
   */
  @IsOptional()
  @IsBoolean()
  sensitive?: boolean;
}
