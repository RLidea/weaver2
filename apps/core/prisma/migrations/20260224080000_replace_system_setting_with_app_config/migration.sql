-- CreateTable: AppConfig (Key-Value store)
CREATE TABLE "AppConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("key")
);

-- Migrate existing SystemSettings data to AppConfig
INSERT INTO "AppConfig" ("key", "value", "updatedAt")
SELECT 'site.name', "siteName", NOW() FROM "SystemSettings" LIMIT 1
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "AppConfig" ("key", "value", "updatedAt")
SELECT 'site.description', "siteDescription", NOW() FROM "SystemSettings" LIMIT 1
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "AppConfig" ("key", "value", "updatedAt")
SELECT 'site.logoUrl', COALESCE("logoUrl", ''), NOW() FROM "SystemSettings" LIMIT 1
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "AppConfig" ("key", "value", "updatedAt")
SELECT 'feature.registrationOpen', "isRegistrationOpen"::TEXT, NOW() FROM "SystemSettings" LIMIT 1
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "AppConfig" ("key", "value", "updatedAt")
SELECT 'feature.announcementActive', "isAnnouncementActive"::TEXT, NOW() FROM "SystemSettings" LIMIT 1
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "AppConfig" ("key", "value", "updatedAt")
SELECT 'feature.announcementMessage', COALESCE("announcementMessage", ''), NOW() FROM "SystemSettings" LIMIT 1
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "AppConfig" ("key", "value", "updatedAt")
SELECT 'feature.announcementType', "announcementType", NOW() FROM "SystemSettings" LIMIT 1
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "AppConfig" ("key", "value", "updatedAt")
SELECT 'content.purgeRetentionDays', "contentPurgeRetentionDays"::TEXT, NOW()
FROM "SystemSettings"
WHERE "contentPurgeRetentionDays" IS NOT NULL
LIMIT 1
ON CONFLICT ("key") DO NOTHING;

-- DropTable: SystemSettings
DROP TABLE "SystemSettings";
