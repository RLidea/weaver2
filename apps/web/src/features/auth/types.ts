import { z } from 'zod';

export const SignInSchema = z.object({
  email: z.string().min(1, '이메일을 입력해주세요').email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

export type SignInRequest = z.infer<typeof SignInSchema> & { rememberMe?: boolean };

export interface SignUpRequest {
  username: string;
  displayName: string;
  email: string;
  password: string;
  agreedTermsIds: string[];
}

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
