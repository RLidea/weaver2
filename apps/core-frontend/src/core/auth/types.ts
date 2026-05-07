import { z } from 'zod';

export const SignInSchema = z.object({
  email: z.string().min(1, '이메일을 입력해주세요').email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

export type SignInRequest = z.infer<typeof SignInSchema> & { rememberMe?: boolean };

export const SignUpSchema = z
  .object({
    username: z
      .string()
      .min(3, '사용자명은 3자 이상이어야 합니다')
      .max(20, '사용자명은 20자 이하여야 합니다')
      .regex(/^[a-z0-9_]+$/, '사용자명은 영소문자, 숫자, 밑줄(_)만 사용할 수 있습니다'),
    displayName: z
      .string()
      .min(2, '표시 이름은 2자 이상이어야 합니다')
      .max(30, '표시 이름은 30자 이하여야 합니다'),
    email: z.string().min(1, '이메일을 입력해주세요').email('올바른 이메일 형식이 아닙니다'),
    password: z
      .string()
      .min(8, '비밀번호는 8자 이상이어야 합니다')
      .max(100, '비밀번호는 100자 이하여야 합니다'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

export type SignUpFormValues = z.infer<typeof SignUpSchema>;

export interface SignUpRequest {
  username: string;
  displayName: string;
  email: string;
  password: string;
  agreedTermsIds: string[];
}

export const ForgotPasswordSchema = z.object({
  email: z.string().min(1, '이메일을 입력해주세요').email('올바른 이메일 형식이 아닙니다'),
});

export type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, '비밀번호는 8자 이상이어야 합니다')
      .max(100, '비밀번호는 100자 이하여야 합니다'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;

export interface RequestPasswordResetRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface Session {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  isCurrent: boolean;
}

export interface TwoFactorStatus {
  totpEnabled: boolean;
  emailOtpEnabled: boolean;
}

export interface TotpSetup {
  secret: string;
  qrCodeUrl: string;
}

// SuccessInterceptor가 { message, ...rest } → { message, data: rest } 로 변환하므로
// 컨트롤러가 flat하게 반환한 필드들이 data에 담긴다.
export interface SignInResponse {
  twoFactorRequired: true;
  preAuthToken: string;
  availableMethods: {
    totp: boolean;
    email: boolean;
  };
}

export interface TwoFactorAuthenticateRequest {
  preAuthToken: string;
  method: 'totp' | 'email';
  code: string;
}

export interface OAuthConnection {
  provider: string;
  providerId: string;
  createdAt: string;
}
