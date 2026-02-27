export type { User } from '@/types/user';

export interface SignInRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}
