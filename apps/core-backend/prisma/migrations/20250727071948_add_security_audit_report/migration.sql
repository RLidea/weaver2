-- CreateTable
CREATE TABLE "security_audit_reports" (
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

    CONSTRAINT "security_audit_reports_pkey" PRIMARY KEY ("id")
);
