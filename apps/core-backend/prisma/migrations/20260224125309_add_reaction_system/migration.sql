-- AlterTable
ALTER TABLE "SystemSettings" RENAME CONSTRAINT "AppConfig_pkey" TO "SystemSettings_pkey";

-- CreateTable
CREATE TABLE "emojis" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unicode" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emojis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_reactions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emojiId" TEXT NOT NULL,

    CONSTRAINT "post_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emojis_code_key" ON "emojis"("code");

-- CreateIndex
CREATE INDEX "post_reactions_postId_idx" ON "post_reactions"("postId");

-- CreateIndex
CREATE INDEX "post_reactions_userId_idx" ON "post_reactions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "post_reactions_postId_userId_emojiId_key" ON "post_reactions"("postId", "userId", "emojiId");

-- AddForeignKey
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_emojiId_fkey" FOREIGN KEY ("emojiId") REFERENCES "emojis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
