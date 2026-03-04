export interface SystemSettings {
  siteName: string;
  siteDescription: string;
  logoUrl: string | null;
  isRegistrationOpen: boolean;
  isAnnouncementActive: boolean;
  announcementMessage: string | null;
  announcementType: string;
  contentPurgeRetentionDays: number | null;
  contentPurgeScheduleHour: number;
  reactionMaxPerUserPerPost: number;
  uploadMaxFileCount: number;
  uploadMaxFileSize: number;
  uploadAllowedMimeTypes: string[];
  uploadThumbnailWidth: number;
  uploadThumbnailHeight: number;
  uploadOrphanRetentionHours: number | null;
}

export type UpdateSystemSettingsDto = Partial<SystemSettings>;
