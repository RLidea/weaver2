-- CreateTable
CREATE TABLE "UserSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isMarketingConsentGiven" BOOLEAN NOT NULL DEFAULT false,
    "isNewsletterSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "isEmailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isSmsNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isPushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "prefersDarkMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSetting_userId_key" ON "UserSetting"("userId");

-- AddForeignKey
ALTER TABLE "UserSetting" ADD CONSTRAINT "UserSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
