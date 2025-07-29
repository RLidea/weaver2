/*
  Warnings:

  - You are about to drop the `system_settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "system_settings";

-- CreateTable
CREATE TABLE "SystemSettings" (
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

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);
