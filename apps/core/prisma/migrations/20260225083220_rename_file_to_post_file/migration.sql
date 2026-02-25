-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_postId_fkey";

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_uploadedById_fkey";

-- RenameTable
ALTER TABLE "File" RENAME TO "post_files";

-- RenamePrimaryKey
ALTER INDEX "File_pkey" RENAME TO "post_files_pkey";

-- RenameIndex
ALTER INDEX "File_storedName_key" RENAME TO "post_files_storedName_key";

-- RenameIndex
ALTER INDEX "File_uploadedById_idx" RENAME TO "post_files_uploadedById_idx";

-- RenameIndex
ALTER INDEX "File_postId_idx" RENAME TO "post_files_postId_idx";

-- RenameIndex
ALTER INDEX "file_cursor_idx" RENAME TO "post_file_cursor_idx";

-- AddForeignKey
ALTER TABLE "post_files" ADD CONSTRAINT "post_files_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_files" ADD CONSTRAINT "post_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
