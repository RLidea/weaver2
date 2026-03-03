import { apiClient } from '@/infrastructure/api-client';
import type {
  SignInRequest,
  SignUpRequest,
  RequestPasswordResetRequest,
  ResetPasswordRequest,
  Session,
} from '../types';

export const authApi = {
  signIn: (body: SignInRequest) =>
    apiClient.post<void>('/v1/auth/sign-in', body),

  signOut: () =>
    apiClient.post<void>('/v1/auth/sign-out'),

  signUp: (body: SignUpRequest) =>
    apiClient.post<void>('/v1/auth/sign-up/email', body),

  verifyEmail: (token: string) =>
    apiClient.get<void>(`/v1/auth/verify?token=${token}`),

  resendVerification: (email: string) =>
    apiClient.post<void>('/v1/auth/verify/resend', { email }),

  requestPasswordReset: (body: RequestPasswordResetRequest) =>
    apiClient.post<void>('/auth/password/request-reset', body),

  resetPassword: (body: ResetPasswordRequest) =>
    apiClient.post<void>('/auth/password/reset', body),

  listSessions: () =>
    apiClient.get<Session[]>('/v1/auth/sessions'),

  revokeSession: (sessionId: string) =>
    apiClient.delete<void>(`/v1/auth/sessions/${sessionId}`),

  revokeOtherSessions: () =>
    apiClient.delete<void>('/v1/auth/sessions/others'),
};
