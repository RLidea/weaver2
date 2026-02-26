-- Add profileImagePath to users for S3-compatible old file deletion
ALTER TABLE "users" ADD COLUMN "profileImagePath" TEXT;
