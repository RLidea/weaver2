-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "siteName" TEXT NOT NULL DEFAULT 'Weaver2',
    "siteDescription" TEXT NOT NULL DEFAULT 'Community Platform',
    "logoUrl" TEXT,
    "isRegistrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "isAnnouncementActive" BOOLEAN NOT NULL DEFAULT false,
    "announcementMessage" TEXT,
    "announcementType" TEXT NOT NULL DEFAULT 'info',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
