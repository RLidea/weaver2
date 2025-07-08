/*
  Warnings:

  - A unique constraint covering the columns `[verificationToken]` on the table `Auth` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Auth_verificationToken_key" ON "Auth"("verificationToken");
