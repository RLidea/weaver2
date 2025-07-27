/*
  Warnings:

  - You are about to drop the `security_audit_reports` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "security_audit_reports";

-- CreateTable
CREATE TABLE "SecurityAuditReport" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scanType" TEXT NOT NULL DEFAULT 'pnpm_audit',
    "scanDuration" INTEGER,
    "totalDependencies" INTEGER NOT NULL,
    "vulnerabilityCount" JSONB NOT NULL,
    "securityScore" INTEGER NOT NULL,
    "rawAuditData" JSONB NOT NULL,
    "vulnerabilities" JSONB NOT NULL,
    "recommendations" JSONB,
    "packageJsonHash" TEXT,
    "lockfileHash" TEXT,

    CONSTRAINT "SecurityAuditReport_pkey" PRIMARY KEY ("id")
);
