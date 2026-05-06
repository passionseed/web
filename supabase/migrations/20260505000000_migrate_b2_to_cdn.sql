-- ============================================================================
-- One-off migration: Rewrite all Backblaze B2 URLs to Cloudflare CDN URLs
-- ============================================================================
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
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Helper function: rewrite a single B2 URL to CDN URL
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _b2_to_cdn(url TEXT)
RETURNS TEXT AS $$
BEGIN
  IF url IS NULL OR url = '' THEN
    RETURN url;
  END IF;

  -- Already a CDN URL — pass through
  IF url LIKE 'https://cdn.passionseed.org/%' THEN
    RETURN url;
  END IF;

  -- Pattern 1: Path-style B2 endpoint (S3-style)
  -- e.g. https://pseed-dev.s3.us-east-005.backblazeb2.com/images/test.webp
  -- → https://cdn.passionseed.org/images/test.webp
  IF url ~ '^https://[^/]+\.s3\.[a-z0-9-]+\.backblazeb2\.com/' THEN
    RETURN regexp_replace(
      url,
      '^https://[^/]+\.s3\.[a-z0-9-]+\.backblazeb2\.com/(.*)$',
      'https://cdn.passionseed.org/\1'
    );
  END IF;

  -- Pattern 2: Virtual-hosted B2 endpoint
  -- e.g. https://s3.us-east-005.backblazeb2.com/pseed-dev/webtoons/phase1-act3/phase1-act3-00.png
  -- → https://cdn.passionseed.org/webtoons/phase1-act3/phase1-act3-00.png
  IF url ~ '^https://s3\.[a-z0-9-]+\.backblazeb2\.com/' THEN
    RETURN regexp_replace(
      url,
      '^https://s3\.[a-z0-9-]+\.backblazeb2\.com/[^/]+/(.*)$',
      'https://cdn.passionseed.org/\1'
    );
  END IF;

  -- Pattern 3: Friendly B2 endpoint (f005, f000, etc.)
  -- e.g. https://f005.backblazeb2.com/file/pseed-dev/guidebook.pdf
  -- → https://cdn.passionseed.org/guidebook.pdf
  IF url ~ '^https://f[0-9]+\.backblazeb2\.com/' THEN
    RETURN regexp_replace(
      url,
      '^https://f[0-9]+\.backblazeb2\.com/file/[^/]+/(.*)$',
      'https://cdn.passionseed.org/\1'
    );
  END IF;

  -- Not a recognized B2 URL — return as-is
  RETURN url;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ----------------------------------------------------------------------------
-- Helper function: rewrite an array of B2 URLs to CDN URLs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _b2_to_cdn_array(urls TEXT[])
RETURNS TEXT[] AS $$
DECLARE
  result TEXT[];
  i INT;
BEGIN
  IF urls IS NULL THEN
    RETURN NULL;
  END IF;

  result := ARRAY[]::TEXT[];
  FOR i IN 1..array_length(urls, 1) LOOP
    result := array_append(result, _b2_to_cdn(urls[i]));
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- CATEGORY 1: TEXT columns (single URL per row)
-- ============================================================================

-- learning_maps
UPDATE public.learning_maps
SET cover_image_url = _b2_to_cdn(cover_image_url)
WHERE cover_image_url LIKE '%backblazeb2.com%';

-- node_content
UPDATE public.node_content
SET content_url = _b2_to_cdn(content_url)
WHERE content_url LIKE '%backblazeb2.com%';

-- seeds
UPDATE public.seeds
SET cover_image_url = _b2_to_cdn(cover_image_url)
WHERE cover_image_url LIKE '%backblazeb2.com%';

-- seed_categories
UPDATE public.seed_categories
SET logo_url = _b2_to_cdn(logo_url)
WHERE logo_url LIKE '%backblazeb2.com%';

-- seed_certificates
UPDATE public.seed_certificates
SET signature_image_url = _b2_to_cdn(signature_image_url)
WHERE signature_image_url LIKE '%backblazeb2.com%';

UPDATE public.seed_certificates
SET logo_url = _b2_to_cdn(logo_url)
WHERE logo_url LIKE '%backblazeb2.com%';

-- issued_certificates
UPDATE public.issued_certificates
SET certificate_url = _b2_to_cdn(certificate_url)
WHERE certificate_url LIKE '%backblazeb2.com%';

-- seed_badges
UPDATE public.seed_badges
SET badge_image_url = _b2_to_cdn(badge_image_url)
WHERE badge_image_url LIKE '%backblazeb2.com%';

-- assessment_submissions
UPDATE public.assessment_submissions
SET image_url = _b2_to_cdn(image_url)
WHERE image_url LIKE '%backblazeb2.com%';

-- hackathon_phase_activity_submissions
UPDATE public.hackathon_phase_activity_submissions
SET image_url = _b2_to_cdn(image_url)
WHERE image_url LIKE '%backblazeb2.com%';

-- hackathon_phase_activity_team_submissions
UPDATE public.hackathon_phase_activity_team_submissions
SET image_url = _b2_to_cdn(image_url)
WHERE image_url LIKE '%backblazeb2.com%';

-- path_assessment_submissions
UPDATE public.path_assessment_submissions
SET image_url = _b2_to_cdn(image_url)
WHERE image_url LIKE '%backblazeb2.com%';

-- path_content
UPDATE public.path_content
SET content_url = _b2_to_cdn(content_url)
WHERE content_url LIKE '%backblazeb2.com%';


-- hackathon_phase_activity_content
UPDATE public.hackathon_phase_activity_content
SET content_url = _b2_to_cdn(content_url)
WHERE content_url LIKE '%backblazeb2.com%';

-- community_images
UPDATE public.community_images
SET url = _b2_to_cdn(url)
WHERE url LIKE '%backblazeb2.com%';

-- post_media
UPDATE public.post_media
SET url = _b2_to_cdn(url)
WHERE url LIKE '%backblazeb2.com%';

-- mentor_profiles
UPDATE public.mentor_profiles
SET photo_url = _b2_to_cdn(photo_url)
WHERE photo_url LIKE '%backblazeb2.com%';

-- expert_profiles
UPDATE public.expert_profiles
SET photo_url = _b2_to_cdn(photo_url)
WHERE photo_url LIKE '%backblazeb2.com%';

-- universities
UPDATE public.universities
SET logo_url = _b2_to_cdn(logo_url)
WHERE logo_url LIKE '%backblazeb2.com%';

-- projects
UPDATE public.projects
SET image_url = _b2_to_cdn(image_url)
WHERE image_url LIKE '%backblazeb2.com%';

-- ============================================================================
-- CATEGORY 2: TEXT[] array columns (multiple URLs per row)
-- ============================================================================

-- assessment_submissions.file_urls
UPDATE public.assessment_submissions
SET file_urls = _b2_to_cdn_array(file_urls)
WHERE file_urls IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(file_urls) AS u
    WHERE u LIKE '%backblazeb2.com%'
  );

-- hackathon_phase_activity_submissions.file_urls
UPDATE public.hackathon_phase_activity_submissions
SET file_urls = _b2_to_cdn_array(file_urls)
WHERE file_urls IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(file_urls) AS u
    WHERE u LIKE '%backblazeb2.com%'
  );

-- hackathon_phase_activity_team_submissions.file_urls
UPDATE public.hackathon_phase_activity_team_submissions
SET file_urls = _b2_to_cdn_array(file_urls)
WHERE file_urls IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(file_urls) AS u
    WHERE u LIKE '%backblazeb2.com%'
  );

-- ============================================================================
-- CATEGORY 3: JSONB columns (embedded URLs)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3a: hackathon_phase_activity_submissions.revisions
-- Each element: { "image_url": text, "file_urls": text[], ... }
-- ----------------------------------------------------------------------------
UPDATE public.hackathon_phase_activity_submissions
SET revisions = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'image_url' IS NOT NULL OR elem->>'file_urls' IS NOT NULL THEN
        jsonb_set(
          jsonb_set(
            elem,
            '{image_url}',
            to_jsonb(_b2_to_cdn(elem->>'image_url'))
          ),
          '{file_urls}',
          CASE
            WHEN elem->>'file_urls' IS NOT NULL THEN
              CASE
                WHEN jsonb_typeof(elem->'file_urls') = 'array' THEN
                  to_jsonb(_b2_to_cdn_array(
                    ARRAY(SELECT jsonb_array_elements_text(elem->'file_urls'))
                  ))
                ELSE
                  to_jsonb(ARRAY[_b2_to_cdn(elem->>'file_urls')])
              END
            ELSE 'null'::jsonb
          END
        )
      ELSE elem
    END
  )
  FROM jsonb_array_elements(revisions) AS elem
)
WHERE revisions IS NOT NULL
  AND revisions != '[]'::jsonb
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(revisions) AS elem
    WHERE (elem->>'image_url' LIKE '%backblazeb2.com%')
       OR elem->>'file_urls' LIKE '%backblazeb2.com%'
  );

-- ----------------------------------------------------------------------------
-- 3b: hackathon_phase_activity_team_submissions.revisions
-- Same structure as individual submissions
-- ----------------------------------------------------------------------------
UPDATE public.hackathon_phase_activity_team_submissions
SET revisions = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'image_url' IS NOT NULL OR elem->>'file_urls' IS NOT NULL THEN
        jsonb_set(
          jsonb_set(
            elem,
            '{image_url}',
            to_jsonb(_b2_to_cdn(elem->>'image_url'))
          ),
          '{file_urls}',
          CASE
            WHEN elem->>'file_urls' IS NOT NULL THEN
              CASE
                WHEN jsonb_typeof(elem->'file_urls') = 'array' THEN
                  to_jsonb(_b2_to_cdn_array(
                    ARRAY(SELECT jsonb_array_elements_text(elem->'file_urls'))
                  ))
                ELSE
                  to_jsonb(ARRAY[_b2_to_cdn(elem->>'file_urls')])
              END
            ELSE 'null'::jsonb
          END
        )
      ELSE elem
    END
  )
  FROM jsonb_array_elements(revisions) AS elem
)
WHERE revisions IS NOT NULL
  AND revisions != '[]'::jsonb
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(revisions) AS elem
    WHERE (elem->>'image_url' LIKE '%backblazeb2.com%')
       OR elem->>'file_urls' LIKE '%backblazeb2.com%'
  );

-- ----------------------------------------------------------------------------
-- 3c: issued_certificates.certificate_data
-- Contains: logo_url, signature_image_url (and other non-URL fields)
-- ----------------------------------------------------------------------------
UPDATE public.issued_certificates
SET certificate_data = jsonb_set(
  jsonb_set(
    certificate_data,
    '{logo_url}',
    to_jsonb(_b2_to_cdn(certificate_data->>'logo_url'))
  ),
  '{signature_image_url}',
  to_jsonb(_b2_to_cdn(certificate_data->>'signature_image_url'))
)
WHERE certificate_data IS NOT NULL
  AND (
    (certificate_data->>'logo_url' LIKE '%backblazeb2.com%')
    OR (certificate_data->>'signature_image_url' LIKE '%backblazeb2.com%')
  );

-- ----------------------------------------------------------------------------
-- 3d: hackathon_phase_activity_content.metadata
-- Contains: { "chunks": [{ "imageUrl": "...", ... }], "variant": "..." }
-- Rewrites imageUrl inside each chunk array element
-- ----------------------------------------------------------------------------
UPDATE public.hackathon_phase_activity_content
SET metadata = jsonb_set(
  metadata,
  '{chunks}',
  (
    SELECT jsonb_agg(
      jsonb_set(elem, '{imageUrl}', to_jsonb(_b2_to_cdn(elem->>'imageUrl')))
    )
    FROM jsonb_array_elements(metadata->'chunks') AS elem
  )
)
WHERE metadata IS NOT NULL
  AND metadata->'chunks' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(metadata->'chunks') AS elem
    WHERE elem->>'imageUrl' LIKE '%backblazeb2.com%'
  );

-- ============================================================================
-- Cleanup: drop helper functions
-- ============================================================================
DROP FUNCTION IF EXISTS _b2_to_cdn(TEXT);
DROP FUNCTION IF EXISTS _b2_to_cdn_array(TEXT[]);

COMMIT;
