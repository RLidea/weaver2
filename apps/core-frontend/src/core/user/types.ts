// User·UserSetting은 세션 정체성 타입으로 @weaver2/auth로 이동 — 기존 import 경로 호환용 재수출
export type { User, UserSetting } from '@weaver2/auth';

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
