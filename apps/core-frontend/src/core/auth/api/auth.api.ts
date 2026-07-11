import { apiClient } from '@weaver2/api-client';
import type {
  SignInRequest,
  SignInResponse,
  SignUpRequest,
  RequestPasswordResetRequest,
  ResetPasswordRequest,
  Session,
  TwoFactorStatus,
  TotpSetup,
  TwoFactorAuthenticateRequest,
  OAuthConnection,
} from '../types';

export const authApi = {
  signIn: (body: SignInRequest) =>
    apiClient.post<SignInResponse | null>('/v1/auth/sign-in', body, { skipOnAuthError: true }),

  sendLoginEmailOtp: (preAuthToken: string) =>
    apiClient.post<void>('/v1/auth/2fa/email/send', { preAuthToken }, { skipOnAuthError: true }),

  twoFactorAuthenticate: (body: TwoFactorAuthenticateRequest) =>
    apiClient.post<void>('/v1/auth/2fa/authenticate', body, { skipOnAuthError: true }),

  signOut: () =>
    apiClient.post<void>('/v1/auth/sign-out'),

  signUp: (body: SignUpRequest) =>
    apiClient.post<void>('/v1/auth/sign-up/email', body),

  verifyEmail: (token: string) =>
    apiClient.get<void>(`/v1/auth/verify?token=${token}`),

  resendVerification: (email: string) =>
    apiClient.post<void>('/v1/auth/verify/resend', { email }),

  requestPasswordReset: (body: RequestPasswordResetRequest) =>
    apiClient.post<void>('/v1/auth/password/request-reset', body),

  resetPassword: (body: ResetPasswordRequest) =>
    apiClient.post<void>('/v1/auth/password/reset', body),

  listSessions: () =>
    apiClient.get<Session[]>('/v1/auth/sessions'),

  revokeSession: (sessionId: string) =>
    apiClient.delete<void>(`/v1/auth/sessions/${sessionId}`),

  revokeOtherSessions: () =>
    apiClient.delete<void>('/v1/auth/sessions/others'),

  // 2FA
  get2faStatus: () =>
    apiClient.get<TwoFactorStatus>('/v1/auth/2fa/status'),

  getTotpSetup: () =>
    apiClient.get<TotpSetup>('/v1/auth/2fa/totp/setup'),

  confirmTotpSetup: (code: string) =>
    apiClient.post<void>('/v1/auth/2fa/totp/confirm', { code }),

  disableTotp: (code: string) =>
    apiClient.deleteWithBody<void>('/v1/auth/2fa/totp', { code }),

  setupEmailOtp: () =>
    apiClient.post<void>('/v1/auth/2fa/email/setup', {}),

  confirmEmailOtp: (code: string) =>
    apiClient.post<void>('/v1/auth/2fa/email/confirm', { code }),

  disableEmailOtp: (code: string) =>
    apiClient.deleteWithBody<void>('/v1/auth/2fa/email', { code }),

  // OAuth 연동
  getOAuthConnections: () =>
    apiClient.get<OAuthConnection[]>('/v1/auth/oauth/connections'),

  disconnectOAuth: (provider: string) =>
    apiClient.delete<void>(`/v1/auth/oauth/connections/${provider}`),
};
