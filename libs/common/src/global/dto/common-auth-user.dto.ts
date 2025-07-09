class CommonAuthUserDto {
  id: string;
  username: string;
  role: string;
  authId: string;
  isLogin: boolean;
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
