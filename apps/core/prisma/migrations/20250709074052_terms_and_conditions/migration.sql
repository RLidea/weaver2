-- CreateTable
CREATE TABLE "TermsAndConditions" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermsAndConditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTermsAgreement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "termsAndConditionsId" TEXT NOT NULL,
    "agreedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTermsAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TermsAndConditions_version_key" ON "TermsAndConditions"("version");

-- CreateIndex
CREATE UNIQUE INDEX "UserTermsAgreement_userId_termsAndConditionsId_key" ON "UserTermsAgreement"("userId", "termsAndConditionsId");

-- AddForeignKey
ALTER TABLE "UserTermsAgreement" ADD CONSTRAINT "UserTermsAgreement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTermsAgreement" ADD CONSTRAINT "UserTermsAgreement_termsAndConditionsId_fkey" FOREIGN KEY ("termsAndConditionsId") REFERENCES "TermsAndConditions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
