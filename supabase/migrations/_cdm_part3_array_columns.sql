

=================================================================
-- Date: 2026-05-05
-- Purpose: Idempotently rewrite B2 URLs in ~20 tables to cdn.passionseed.org
--
-- Patterns handled:
--   1. Path-style B2: https://{bucket}.s3.{region}.backblazeb2.com/{path}
--      → https://cdn.passionseed.org/{path}
--   2. Virtual-hosted B2: https://s3.{region}.backblazeb2.com/{bucket}/{path}
--      → https://cdn.passionseed.org/{path}
--   3. Friendly B2: https://f005.backblazeb2.com/file/{bucket}/{path}
--      → https://cdn.passionseed.org/{path}
--
-- Excluded (not B2 / not image URLs):
--   - Supabase Storage URLs (profiles.avatar_url, hackathon_teams.team_avatar_url)
--   - _key columns (B2 file keys, not URLs)
--   - Non-image URL columns (website_url, linkedin_url, etc.)
--   - reflections.image_url (column does not exist in schema)
;

COMMIT;