/**
 * 백엔드 UserDto 기반 사용자 타입
 * GET /v1/users/me 응답 데이터
 */
export interface User {
  id: string;
  username: string;
  displayName: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  username?: string;
  marketingConsent?: boolean;
  newsletterConsent?: boolean;
  emailNotification?: boolean;
  smsNotification?: boolean;
  pushNotification?: boolean;
  darkMode?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RequestEmailChangeRequest {
  currentPassword: string;
  newEmail: string;
}

export interface ConfirmEmailChangeRequest {
  code: string;
}
