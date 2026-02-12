-- DropForeignKey
ALTER TABLE "BoardPermission" DROP CONSTRAINT "BoardPermission_boardId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role";

-- DropTable
DROP TABLE "BoardPermission";

-- DropEnum
DROP TYPE "ActionType";

-- DropEnum
DROP TYPE "Role";
