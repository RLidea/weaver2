import { apiClient } from '@/infrastructure/api-client';
import type { User } from '@/types/user';

export interface SignInRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export const authApi = {
  signIn: (body: SignInRequest) =>
    apiClient.post<void>('/v1/auth/sign-in', body),

  signOut: () =>
    apiClient.post('/v1/auth/sign-out'),

  getMe: () =>
    apiClient.get<User>('/v1/users/me'),
};
