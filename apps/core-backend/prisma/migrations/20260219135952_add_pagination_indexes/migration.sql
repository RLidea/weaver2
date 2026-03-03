-- CreateIndex
CREATE INDEX "post_cursor_idx" ON "Post"("createdAt" DESC, "id");

-- CreateIndex
CREATE INDEX "post_viewcount_cursor_idx" ON "Post"("viewCount" DESC, "id");
