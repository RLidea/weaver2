/*
  Warnings:

  - You are about to drop the `reports` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AbuseReportTarget" AS ENUM ('POST', 'COMMENT', 'USER', 'MEDIA');

-- CreateEnum
CREATE TYPE "AbuseReportReason" AS ENUM ('SPAM', 'INAPPROPRIATE_CONTENT', 'HARASSMENT', 'HATE_SPEECH', 'MISINFORMATION', 'COPYRIGHT_VIOLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "AbuseReportStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AbuseReportAction" AS ENUM ('CONTENT_HIDDEN', 'CONTENT_DELETED', 'USER_WARNED', 'USER_SUSPENDED', 'NO_ACTION');

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_reporterId_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_resolvedById_fkey";

-- DropTable
DROP TABLE "reports";

-- DropEnum
DROP TYPE "ReportAction";

-- DropEnum
DROP TYPE "ReportReason";

-- DropEnum
DROP TYPE "ReportStatus";

-- DropEnum
DROP TYPE "ReportTarget";

-- CreateTable
CREATE TABLE "abuse_reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "AbuseReportTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "AbuseReportReason" NOT NULL,
    "description" TEXT,
    "status" "AbuseReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "actionTaken" "AbuseReportAction",
    "moderatorNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abuse_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "abuse_reports_status_createdAt_idx" ON "abuse_reports"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "abuse_reports_targetType_targetId_idx" ON "abuse_reports"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "abuse_reports_reporterId_targetType_targetId_key" ON "abuse_reports"("reporterId", "targetType", "targetId");

-- AddForeignKey
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
