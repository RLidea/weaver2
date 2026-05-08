-- P1 indexes: cover frequent filter columns missing from existing composite indexes.

CREATE INDEX IF NOT EXISTS "post_author_idx"
  ON "posts" ("authorId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "post_category_idx"
  ON "posts" ("categoryId");

CREATE INDEX IF NOT EXISTS "comment_author_idx"
  ON "comments" ("authorId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_idx"
  ON "refresh_tokens" ("userId");
