-- Performance indexes for the content workspace.
--
-- 1. pg_trgm makes `title`/`slug` ILIKE '%term%' search indexable. Without it
--    the editor list and the public site's search scan every published row.
--    pg_trgm is a trusted extension, so the database owner can create it.
-- 2. Public reads always filter one workspace + collection + PUBLISHED and sort
--    by publishedAt; the composite index answers that without a sort.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "ContentItem_title_idx"
  ON "ContentItem" USING GIN ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "ContentItem_slug_idx"
  ON "ContentItem" USING GIN ("slug" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "ContentItem_workspaceId_kind_status_publishedAt_idx"
  ON "ContentItem" ("workspaceId", "kind", "status", "publishedAt");
