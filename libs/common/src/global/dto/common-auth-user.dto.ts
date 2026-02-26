class CommonAuthUserDto {
  id: string;
  username: string;
  isLogin: boolean;
  totpEnabled?: boolean;
  emailOtpEnabled?: boolean;
  userSetting?: {
    isMarketingConsentGiven: boolean;
    isNewsletterSubscribed: boolean;
    isEmailNotificationsEnabled: boolean;
    isSmsNotificationsEnabled: boolean;
    isPushNotificationsEnabled: boolean;
    prefersDarkMode: boolean;
  };
}

export { CommonAuthUserDto };
