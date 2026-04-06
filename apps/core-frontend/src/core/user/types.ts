/**
 * 백엔드 UserDto 기반 사용자 타입
 * GET /v1/users/me 응답 데이터
 */
export interface UserSetting {
  isEmailNotificationsEnabled: boolean;
  isSmsNotificationsEnabled: boolean;
  isPushNotificationsEnabled: boolean;
  isMarketingConsentGiven: boolean;
  isNewsletterSubscribed: boolean;
  prefersDarkMode: boolean;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  profileImageUrl: string | null;
  /** 부여된 permission 문자열 목록. 일반 사용자는 [] */
  permissions: string[];
  /** 사용자 설정 (GET /users/me 전용) */
  userSetting?: UserSetting;
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
