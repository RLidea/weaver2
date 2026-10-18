-- CreateEnum
CREATE TYPE "PostRevisionActorKind" AS ENUM ('SESSION', 'TOKEN');

-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "keepRevisions" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "post_revisions" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorKind" "PostRevisionActorKind" NOT NULL DEFAULT 'SESSION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_revision_post_idx" ON "post_revisions"("postId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

