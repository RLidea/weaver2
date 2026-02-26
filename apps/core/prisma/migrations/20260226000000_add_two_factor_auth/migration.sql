-- Rename twoFactorEnabled → totpEnabled
ALTER TABLE "local_credentials" RENAME COLUMN "twoFactorEnabled" TO "totpEnabled";

-- Rename twoFactorSecret → totpSecret
ALTER TABLE "local_credentials" RENAME COLUMN "twoFactorSecret" TO "totpSecret";

-- Add emailOtpEnabled column
ALTER TABLE "local_credentials" ADD COLUMN "emailOtpEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Create two_factor_challenges table
CREATE TABLE "two_factor_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "two_factor_challenges_userId_method_idx" ON "two_factor_challenges"("userId", "method");

-- AddForeignKey
ALTER TABLE "two_factor_challenges" ADD CONSTRAINT "two_factor_challenges_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
