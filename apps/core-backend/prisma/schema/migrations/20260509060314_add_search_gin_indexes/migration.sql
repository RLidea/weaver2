-- Full-text search GIN indexes
-- These accelerate the @@ to_tsquery operator used by SearchService.
-- Posts: title + content combined.
-- Comments: content only.

CREATE INDEX IF NOT EXISTS "posts_search_gin_idx"
  ON "posts"
  USING GIN (to_tsvector('simple', "title" || ' ' || "content"));

CREATE INDEX IF NOT EXISTS "comments_search_gin_idx"
  ON "comments"
  USING GIN (to_tsvector('simple', "content"));
