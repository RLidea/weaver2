/*
  Warnings:

  - You are about to drop the column `isPublic` on the `Board` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('READ', 'WRITE', 'EDIT_OWN', 'EDIT_ALL', 'DELETE_OWN', 'DELETE_ALL', 'COMMENT');

-- AlterTable
ALTER TABLE "Board" DROP COLUMN "isPublic";

-- CreateTable
CREATE TABLE "BoardPermission" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "action" "ActionType" NOT NULL,
    "allowAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "allowedRoles" "Role"[],
    "allowedUserIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoardPermission_boardId_action_key" ON "BoardPermission"("boardId", "action");

-- AddForeignKey
ALTER TABLE "BoardPermission" ADD CONSTRAINT "BoardPermission_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
