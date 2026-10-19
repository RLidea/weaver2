-- AlterTable: SSO 세션의 id_token sid — back-channel 로그아웃이 이 값으로 세션을 지운다
ALTER TABLE "refresh_tokens" ADD COLUMN "oidcSid" TEXT;

-- CreateIndex
CREATE INDEX "refresh_tokens_oidcSid_idx" ON "refresh_tokens"("oidcSid");

-- CreateTable: 받은 logout_token 의 jti (재사용 거절)
CREATE TABLE "oidc_logout_jtis" (
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oidc_logout_jtis_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE INDEX "oidc_logout_jtis_expiresAt_idx" ON "oidc_logout_jtis"("expiresAt");
