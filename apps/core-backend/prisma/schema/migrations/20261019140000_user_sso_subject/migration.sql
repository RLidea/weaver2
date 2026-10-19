-- AlterTable: 바깥 계정 서버(AUTH_MODE=sso)의 sub
ALTER TABLE "users" ADD COLUMN "ssoSubject" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_ssoSubject_key" ON "users"("ssoSubject");
