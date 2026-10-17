import { apiClient } from '@weaver2/api-client';
import type {
  User,
  SignInRequest,
  SignInResponse,
  SignUpRequest,
  RequestPasswordResetRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  Session,
  TwoFactorStatus,
  TotpSetup,
  TwoFactorAuthenticateRequest,
  OAuthConnection,
} from '../types';

export const authApi = {
  /** 현재 로그인 사용자 조회 — 비로그인(401)도 정상 플로우라 onAuthError를 건너뛴다 */
  getMe: () => apiClient.get<User>('/v1/users/me', { skipOnAuthError: true }),

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

  /** 토큰과 가입 때 정한 비밀번호가 둘 다 맞아야 인증된다 (선점 가입 탈취 방지) */
  verifyEmail: (body: VerifyEmailRequest) =>
    apiClient.post<void>('/v1/auth/verify', body),

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

  // 새 비밀을 쓰므로 POST 다 (GET 이면 다른 사이트의 링크로도 실행된다)
  startTotpSetup: () =>
    apiClient.post<TotpSetup>('/v1/auth/2fa/totp/setup', {}),

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

  // 2FA 해제 같은 민감한 동작 전에 확인 코드를 메일로 받는다
  sendStepUpCode: () =>
    apiClient.post<void>('/v1/auth/2fa/step-up/send', {}),

  // OAuth 연동
  getOAuthConnections: () =>
    apiClient.get<OAuthConnection[]>('/v1/auth/oauth/connections'),

  disconnectOAuth: (provider: string) =>
    apiClient.delete<void>(`/v1/auth/oauth/connections/${provider}`),
};
